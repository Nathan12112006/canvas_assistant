// background.js - Canvas API client + context cache

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_CANVAS_CONTEXT") {
    fetchCanvasContext(msg.canvasToken, msg.canvasDomain)
      .then(ctx => sendResponse({ success: true, context: ctx }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === "CALL_AI") {
    callAiProxy(msg.proxyUrl, msg.systemPrompt, msg.messages)
      .then(reply => sendResponse({ success: true, reply }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_SETTINGS") {
    chrome.storage.local.get(
      ["canvasToken", "canvasDomain", "proxyUrl", "cachedContext", "cachedAt"],
      data => sendResponse(data)
    );
    return true;
  }

  if (msg.type === "CLEAR_CACHE") {
    chrome.storage.local.remove(["cachedContext", "cachedAt"], () => sendResponse({ success: true }));
    return true;
  }
});

async function canvasFetch(domain, token, path) {
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://${domain}/api/v1${path}${separator}per_page=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Canvas API error ${res.status} on ${path}`);
  return res.json();
}

async function fetchCanvasContext(token, domain) {
  const stored = await chrome.storage.local.get(["cachedContext", "cachedAt"]);
  if (stored.cachedContext && stored.cachedAt && Date.now() - stored.cachedAt < CACHE_TTL) {
    return stored.cachedContext;
  }

  const courses = await canvasFetch(domain, token, "/courses?enrollment_state=active&state[]=available");
  const activeCourses = courses.filter(c => c.name && !c.access_restricted_by_date).slice(0, 10);

  const courseContexts = await Promise.all(
    activeCourses.map(course => fetchCourseData(domain, token, course))
  );

  const context = {
    fetchedAt: new Date().toISOString(),
    domain,
    courses: courseContexts.filter(Boolean)
  };

  await chrome.storage.local.set({ cachedContext: context, cachedAt: Date.now() });
  return context;
}

async function fetchCourseData(domain, token, course) {
  try {
    const [assignments, announcements, modules] = await Promise.all([
      canvasFetch(domain, token, `/courses/${course.id}/assignments?order_by=due_at&include[]=submission`).catch(() => []),
      canvasFetch(domain, token, `/courses/${course.id}/discussion_topics?only_announcements=true`).catch(() => []),
      canvasFetch(domain, token, `/courses/${course.id}/modules`).catch(() => [])
    ]);

    const now = Date.now();
    const assignmentsWithDueDate = assignments.filter(a => a.due_at);
    const assignmentItems = assignmentsWithDueDate
      .map(a => normalizeAssignment(a, now))
      .filter(Boolean)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
      .slice(0, 30);

    const recentAnnouncements = announcements
      .slice(0, 10)
      .map(a => ({
        title: a.title,
        posted_at: a.posted_at,
        message: stripHtml(a.message || "").slice(0, 800)
      }));

    return {
      id: course.id,
      name: course.name,
      code: course.course_code,
      assignments: assignmentItems,
      announcements: recentAnnouncements,
      moduleCount: modules.length
    };
  } catch (e) {
    console.warn(`Failed to fetch data for course ${course.name}:`, e);
    return null;
  }
}

function normalizeAssignment(assignment, now) {
  const dueTime = new Date(assignment.due_at).getTime();
  if (Number.isNaN(dueTime)) return null;

  const submission = assignment.submission || {};
  const submittedAt = submission.submitted_at || null;
  const workflowState = submission.workflow_state || "";
  const isExcused = Boolean(submission.excused);
  const isSubmitted = isExcused || Boolean(submittedAt) || [
    "submitted",
    "graded",
    "pending_review",
    "complete"
  ].includes(workflowState);
  const isPastDue = dueTime < now;
  const isMissing = Boolean(submission.missing) || (isPastDue && !isSubmitted && !isExcused);
  const shouldShow = !isSubmitted || isMissing || dueTime >= now - (14 * 24 * 60 * 60 * 1000);

  if (!shouldShow) return null;

  return {
    id: assignment.id,
    name: assignment.name,
    due_at: assignment.due_at,
    points: assignment.points_possible,
    description: stripHtml(assignment.description || "").slice(0, 500),
    submission_types: assignment.submission_types || [],
    actionLabel: humanizeSubmissionTypes(assignment.submission_types || []),
    isSubmitted,
    submittedAt,
    isMissing,
    isPastDue,
    isExcused,
    workflowState
  };
}

function humanizeSubmissionTypes(types) {
  if (!types || !types.length) return "Check assignment details";

  const labels = types
    .filter(type => !["none", "not_graded"].includes(type))
    .map(type => {
      switch (type) {
        case "online_upload":
          return "Upload a file";
        case "online_text_entry":
          return "Submit a text entry";
        case "online_url":
          return "Submit a website URL";
        case "media_recording":
          return "Record media";
        case "student_annotation":
          return "Complete the annotation";
        case "discussion_topic":
          return "Post to the discussion";
        case "online_quiz":
          return "Complete the quiz";
        case "on_paper":
          return "Turn in on paper";
        case "external_tool":
          return "Complete the external tool activity";
        case "attendance":
          return "Complete the attendance item";
        default:
          return type.replace(/_/g, " ");
      }
    });

  return labels.length ? labels.join(" or ") : "Check assignment details";
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function callAiProxy(proxyUrl, systemPrompt, messages) {
  const baseUrl = normalizeProxyUrl(proxyUrl);
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemPrompt,
      messages
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI proxy error ${res.status}`);
  }

  const data = await res.json();
  return data.reply || "";
}

function normalizeProxyUrl(proxyUrl) {
  const value = String(proxyUrl || "").trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("Proxy URL is missing.");
  }
  return value;
}
