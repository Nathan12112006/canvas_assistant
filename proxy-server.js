const fs = require("fs");
const path = require("path");
const http = require("http");

loadDotEnv();

const PORT = process.env.PORT || 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const PUBLIC_DIR = path.join(__dirname, "public");

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendEmpty(res, 204, req);
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, model: OPENAI_MODEL }, req);
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    await handleChat(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/canvas/context") {
    await handleCanvasContext(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Canvas assistant web app listening on http://localhost:${PORT}`);
});

async function handleChat(req, res) {
  try {
    const body = await readJsonBody(req);
    const systemPrompt = String(body.systemPrompt || "");
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_completion_tokens: 2048,
        messages: [{ role: "system", content: systemPrompt }, ...messages]
      })
    });

    if (!openaiRes.ok) {
      const error = await openaiRes.json().catch(() => ({}));
      sendJson(res, openaiRes.status, { error: error.error?.message || "OpenAI request failed." }, req);
      return;
    }

    const data = await openaiRes.json();
    sendJson(res, 200, { reply: data.choices?.[0]?.message?.content || "" }, req);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Proxy request failed." }, req);
  }
}

async function handleCanvasContext(req, res) {
  try {
    const body = await readJsonBody(req);
    const domain = normalizeCanvasDomain(body.canvasDomain);
    const token = String(body.canvasToken || "").trim();

    if (!domain || !token) {
      sendJson(res, 400, { error: "Canvas domain and token are required." }, req);
      return;
    }

    const context = await fetchCanvasContext(token, domain);
    sendJson(res, 200, { context }, req);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Canvas request failed." }, req);
  }
}

async function fetchCanvasContext(token, domain) {
  const [courses, profile] = await Promise.all([
    canvasFetch(domain, token, "/courses?enrollment_state=active&state[]=available"),
    canvasFetch(domain, token, "/users/self/profile").catch(() => null)
  ]);
  const activeCourses = courses.filter(course => course.name && !course.access_restricted_by_date).slice(0, 12);
  const courseContexts = await Promise.all(activeCourses.map(course => fetchCourseData(domain, token, course)));
  const normalizedCourses = courseContexts.filter(Boolean);
  const calendarItems = normalizedCourses
    .flatMap(course => course.assignments.map(assignment => ({
      ...assignment,
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code
    })))
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 120);

  return {
    fetchedAt: new Date().toISOString(),
    domain,
    user: profile ? {
      id: profile.id,
      name: profile.name || profile.short_name || "Student",
      shortName: profile.short_name || profile.name || "Student",
      avatarUrl: profile.avatar_url || "",
      primaryEmail: profile.primary_email || ""
    } : null,
    summary: summarizeDashboard(normalizedCourses),
    calendarItems,
    courses: normalizedCourses
  };
}

async function canvasFetch(domain, token, requestPath) {
  const separator = requestPath.includes("?") ? "&" : "?";
  const res = await fetch(`https://${domain}/api/v1${requestPath}${separator}per_page=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Canvas API error ${res.status} on ${requestPath}`);
  return res.json();
}

async function fetchCourseData(domain, token, course) {
  try {
    const [assignments, announcements, modules] = await Promise.all([
      canvasFetch(domain, token, `/courses/${course.id}/assignments?order_by=due_at&include[]=submission&include[]=rubric`).catch(() => []),
      canvasFetch(domain, token, `/courses/${course.id}/discussion_topics?only_announcements=true`).catch(() => []),
      canvasFetch(domain, token, `/courses/${course.id}/modules`).catch(() => [])
    ]);

    const now = Date.now();
    const assignmentItems = assignments
      .filter(assignment => assignment.due_at)
      .map(assignment => normalizeAssignment(assignment, now))
      .filter(Boolean)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
      .slice(0, 30);

    const recentAnnouncements = announcements.slice(0, 10).map(item => ({
      title: item.title,
      posted_at: item.posted_at,
      message: stripHtml(item.message || "").slice(0, 800)
    }));

    const analysisAssignments = assignments
      .map(assignment => summarizeAssignmentForAnalysis(assignment, now))
      .filter(Boolean)
      .slice(0, 40);

    return {
      id: course.id,
      name: course.name,
      code: course.course_code,
      assignments: assignmentItems,
      announcements: recentAnnouncements,
      analysisAssignments,
      moduleCount: modules.length
    };
  } catch (error) {
    console.warn(`Failed to fetch course data for ${course.name}:`, error);
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
  const isSubmitted = isExcused || Boolean(submittedAt) || ["submitted", "graded", "pending_review", "complete"].includes(workflowState);
  const isPastDue = dueTime < now;
  const isMissing = Boolean(submission.missing) || (isPastDue && !isSubmitted && !isExcused);
  const shouldShow = !isSubmitted || isMissing || dueTime >= now - (14 * 24 * 60 * 60 * 1000);
  if (!shouldShow) return null;

  return {
    id: assignment.id,
    name: assignment.name,
    due_at: assignment.due_at,
    html_url: assignment.html_url || "",
    points: assignment.points_possible,
    description: stripHtml(assignment.description || "").slice(0, 500),
    rubricSummary: extractRubricSummary(assignment.rubric || []),
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

function summarizeAssignmentForAnalysis(assignment, now) {
  const dueTime = assignment.due_at ? new Date(assignment.due_at).getTime() : Number.NaN;
  const submission = assignment.submission || {};
  const submittedAt = submission.submitted_at || null;
  const workflowState = submission.workflow_state || "";
  const isExcused = Boolean(submission.excused);
  const isSubmitted = isExcused || Boolean(submittedAt) || ["submitted", "graded", "pending_review", "complete"].includes(workflowState);
  const isPastDue = !Number.isNaN(dueTime) && dueTime < now;
  const isMissing = Boolean(submission.missing) || (isPastDue && !isSubmitted && !isExcused);
  const description = stripHtml(assignment.description || "");
  const rubricSummary = extractRubricSummary(assignment.rubric || []);

  if (!assignment.name && !description && !rubricSummary.length) return null;

  return {
    id: assignment.id,
    name: assignment.name || "Untitled assignment",
    due_at: assignment.due_at || null,
    points: assignment.points_possible || null,
    submissionTypes: assignment.submission_types || [],
    actionLabel: humanizeSubmissionTypes(assignment.submission_types || []),
    description: description.slice(0, 1800),
    rubricSummary,
    isSubmitted,
    isMissing,
    workflowState
  };
}

function extractRubricSummary(rubricItems) {
  return rubricItems
    .map(item => {
      const points = item.points != null ? `${item.points} pts` : "";
      const description = stripHtml(item.description || "");
      const longDescription = stripHtml(item.long_description || "");
      return [item.description || item.criterion_description || "", points, description, longDescription]
        .filter(Boolean)
        .join(" - ")
        .slice(0, 500);
    })
    .filter(Boolean)
    .slice(0, 12);
}

function summarizeDashboard(courses) {
  const assignments = courses.flatMap(course => course.assignments || []);
  const upcoming = assignments.filter(item => !item.isSubmitted && !item.isMissing);
  const overdue = assignments.filter(item => item.isMissing);
  const submitted = assignments.filter(item => item.isSubmitted && !item.isMissing);

  return {
    courseCount: courses.length,
    assignmentCount: assignments.length,
    upcomingCount: upcoming.length,
    overdueCount: overdue.length,
    submittedCount: submitted.length
  };
}

function humanizeSubmissionTypes(types) {
  if (!types || !types.length) return "Check assignment details";
  const labels = types.filter(type => !["none", "not_graded"].includes(type)).map(type => {
    switch (type) {
      case "online_upload": return "Upload a file";
      case "online_text_entry": return "Submit a text entry";
      case "online_url": return "Submit a website URL";
      case "media_recording": return "Record media";
      case "student_annotation": return "Complete the annotation";
      case "discussion_topic": return "Post to the discussion";
      case "online_quiz": return "Complete the quiz";
      case "on_paper": return "Turn in on paper";
      case "external_tool": return "Complete the external tool activity";
      case "attendance": return "Complete the attendance item";
      default: return type.replace(/_/g, " ");
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

function normalizeCanvasDomain(value) {
  return String(value || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function serveStatic(req, res) {
  const requestUrl = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC_DIR, sanitizePath(requestUrl));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden", req);
    return;
  }
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendText(res, 404, "Not found", req);
      return;
    }
    res.writeHead(200, {
      ...corsHeaders(req),
      "Content-Type": getContentType(filePath)
    });
    res.end(contents);
  });
}

function sanitizePath(requestUrl) {
  return requestUrl.split("?")[0].replace(/^\/+/, "");
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "text/plain; charset=utf-8";
}

function sendJson(res, status, payload, req) {
  res.writeHead(status, {
    ...corsHeaders(req),
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, message, req) {
  res.writeHead(status, {
    ...corsHeaders(req),
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(message);
}

function sendEmpty(res, status, req) {
  res.writeHead(status, corsHeaders(req));
  res.end();
}

function corsHeaders(req) {
  const requestOrigin = req?.headers?.origin;
  const allowAnyOrigin = !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes("*");
  const allowOrigin = allowAnyOrigin
    ? "*"
    : requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
