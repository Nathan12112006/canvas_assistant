const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

loadDotEnv();

const PORT = process.env.PORT || 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const SESSION_SECRET = process.env.SESSION_SECRET || OPENAI_API_KEY;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const PUBLIC_DIR = path.join(__dirname, "public");
const DEFAULT_DATA_DIR = path.join(__dirname, "data");
const CONFIGURED_DATA_DIR = String(process.env.DATA_DIR || "").trim();
const ACCOUNT_STORAGE_FILE = String(process.env.ACCOUNT_STORAGE_FILE || "").trim();
const DATA_DIR = ACCOUNT_STORAGE_FILE
  ? path.dirname(ACCOUNT_STORAGE_FILE)
  : (CONFIGURED_DATA_DIR || DEFAULT_DATA_DIR);
const ACCOUNTS_FILE = ACCOUNT_STORAGE_FILE || path.join(DATA_DIR, "accounts.json");

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

ensureDataFiles();

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

  if (req.method === "POST" && req.url === "/api/auth/signup") {
    await handleSignup(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/login") {
    await handleLogin(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/auth/session") {
    await handleSession(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/update-profile") {
    await handleUpdateProfile(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/update-canvas") {
    await handleUpdateCanvas(req, res);
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

async function handleSignup(req, res) {
  try {
    const body = await readJsonBody(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "").trim();
    const canvasDomain = normalizeCanvasDomain(body.canvasDomain);
    const canvasToken = String(body.canvasToken || "").trim();

    if (!username || !password || !canvasDomain || !canvasToken) {
      sendJson(res, 400, { error: "Username, password, Canvas domain, and Canvas token are required." }, req);
      return;
    }

    if (password.length < 6) {
      sendJson(res, 400, { error: "Choose a password with at least 6 characters." }, req);
      return;
    }

    const accounts = readAccounts();
    if (accounts[username]) {
      sendJson(res, 409, { error: "That username already exists." }, req);
      return;
    }

    await fetchCanvasContext(canvasToken, canvasDomain);

    const salt = createSalt();
    const now = new Date().toISOString();
    accounts[username] = {
      username,
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      canvasDomain,
      canvasToken,
      createdAt: now,
      updatedAt: now
    };
    writeAccounts(accounts);

    sendJson(res, 200, {
      token: createSessionToken(username),
      account: sanitizeAccount(accounts[username])
    }, req);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Signup failed." }, req);
  }
}

async function handleLogin(req, res) {
  try {
    const body = await readJsonBody(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "").trim();
    const account = readAccounts()[username];

    if (!username || !password) {
      sendJson(res, 400, { error: "Username and password are required." }, req);
      return;
    }

    if (!account) {
      sendJson(res, 404, { error: "That username does not exist." }, req);
      return;
    }

    const passwordHash = hashPassword(password, account.passwordSalt);
    if (passwordHash !== account.passwordHash) {
      sendJson(res, 401, { error: "Incorrect password." }, req);
      return;
    }

    sendJson(res, 200, {
      token: createSessionToken(username),
      account: sanitizeAccount(account)
    }, req);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Login failed." }, req);
  }
}

async function handleSession(req, res) {
  try {
    const account = requireAuthenticatedAccount(req);
    sendJson(res, 200, { account: sanitizeAccount(account) }, req);
  } catch (error) {
    sendJson(res, 401, { error: error.message || "Unauthorized." }, req);
  }
}

async function handleUpdateProfile(req, res) {
  try {
    const body = await readJsonBody(req);
    const authenticated = requireAuthenticatedAccount(req);
    const currentUsername = authenticated.username;
    const nextUsername = normalizeUsername(body.username);
    const nextPassword = String(body.password || "").trim();
    const accounts = readAccounts();
    const account = accounts[currentUsername];

    if (!account) {
      sendJson(res, 404, { error: "Account not found." }, req);
      return;
    }

    if (!nextUsername) {
      sendJson(res, 400, { error: "Username is required." }, req);
      return;
    }

    if (nextUsername !== currentUsername && accounts[nextUsername]) {
      sendJson(res, 409, { error: "That username already exists." }, req);
      return;
    }

    if (nextPassword && nextPassword.length < 6) {
      sendJson(res, 400, { error: "Choose a password with at least 6 characters." }, req);
      return;
    }

    const nextAccount = {
      ...account,
      username: nextUsername,
      updatedAt: new Date().toISOString()
    };

    if (nextPassword) {
      const salt = createSalt();
      nextAccount.passwordSalt = salt;
      nextAccount.passwordHash = hashPassword(nextPassword, salt);
    }

    delete accounts[currentUsername];
    accounts[nextUsername] = nextAccount;
    writeAccounts(accounts);

    sendJson(res, 200, {
      token: createSessionToken(nextUsername),
      account: sanitizeAccount(nextAccount)
    }, req);
  } catch (error) {
    sendJson(res, error.message === "Unauthorized." ? 401 : 500, { error: error.message || "Profile update failed." }, req);
  }
}

async function handleUpdateCanvas(req, res) {
  try {
    const body = await readJsonBody(req);
    const authenticated = requireAuthenticatedAccount(req);
    const accounts = readAccounts();
    const account = accounts[authenticated.username];
    if (!account) {
      sendJson(res, 404, { error: "Account not found." }, req);
      return;
    }

    const nextDomain = normalizeCanvasDomain(body.canvasDomain || account.canvasDomain);
    const suppliedToken = String(body.canvasToken || "").trim();
    const nextToken = suppliedToken || account.canvasToken;

    if (!nextDomain) {
      sendJson(res, 400, { error: "Canvas domain is required." }, req);
      return;
    }

    if (!nextToken) {
      sendJson(res, 400, { error: "Canvas token is required to save Canvas settings." }, req);
      return;
    }

    if (!suppliedToken && nextDomain !== account.canvasDomain) {
      sendJson(res, 400, { error: "Provide a Canvas token when changing the Canvas domain." }, req);
      return;
    }

    await fetchCanvasContext(nextToken, nextDomain);

    accounts[authenticated.username] = {
      ...account,
      canvasDomain: nextDomain,
      canvasToken: nextToken,
      updatedAt: new Date().toISOString()
    };
    writeAccounts(accounts);

    sendJson(res, 200, { account: sanitizeAccount(accounts[authenticated.username]) }, req);
  } catch (error) {
    sendJson(res, error.message === "Unauthorized." ? 401 : 500, { error: error.message || "Canvas update failed." }, req);
  }
}

async function handleCanvasContext(req, res) {
  try {
    const account = requireAuthenticatedAccount(req);
    const context = await fetchCanvasContext(account.canvasToken, account.canvasDomain);
    sendJson(res, 200, { context }, req);
  } catch (error) {
    sendJson(res, error.message === "Unauthorized." ? 401 : 500, { error: error.message || "Canvas request failed." }, req);
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

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, "{}\n", "utf8");
  }
}

function readAccounts() {
  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, `${JSON.stringify(accounts, null, 2)}\n`, "utf8");
}

function sanitizeAccount(account) {
  return {
    username: account.username,
    canvasDomain: account.canvasDomain,
    hasCanvasToken: Boolean(account.canvasToken),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSessionToken(username) {
  const payload = {
    username,
    exp: Date.now() + (1000 * 60 * 60 * 24 * 14)
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  const rawToken = String(token || "");
  const [encodedPayload, signature] = rawToken.split(".");
  if (!encodedPayload || !signature) throw new Error("Unauthorized.");

  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
  if (signature.length !== expectedSignature.length) {
    throw new Error("Unauthorized.");
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("Unauthorized.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload.username || !payload.exp || payload.exp < Date.now()) {
    throw new Error("Unauthorized.");
  }
  return payload;
}

function readBearerToken(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireAuthenticatedAccount(req) {
  const token = readBearerToken(req);
  const payload = verifySessionToken(token);
  const account = readAccounts()[normalizeUsername(payload.username)];
  if (!account) throw new Error("Unauthorized.");
  return account;
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
