
const STORAGE_KEYS = {
  accounts: "canvasDashboardAccounts",
  currentUser: "canvasDashboardCurrentUser"
};

const state = {
  context: null,
  currentUser: "",
  settings: { canvasDomain: "", canvasToken: "" },
  hiddenCourses: [],
  chatHistory: [],
  essayCoach: null
};

const elements = {
  setupScreen: qs("#setupScreen"),
  dashboardScreen: qs("#dashboardScreen"),
  statusBar: qs("#statusBar"),
  heroLoginBtn: qs("#heroLoginBtn"),
  heroSignupBtn: qs("#heroSignupBtn"),
  authTabLogin: qs("#authTabLogin"),
  authTabSignup: qs("#authTabSignup"),
  loginView: qs("#loginView"),
  signupView: qs("#signupView"),
  loginUsernameInput: qs("#loginUsernameInput"),
  loginPasswordInput: qs("#loginPasswordInput"),
  signupUsernameInput: qs("#signupUsernameInput"),
  signupPasswordInput: qs("#signupPasswordInput"),
  signupDomainInput: qs("#signupDomainInput"),
  signupTokenInput: qs("#signupTokenInput"),
  loginBtn: qs("#loginBtn"),
  signupBtn: qs("#signupBtn"),
  refreshBtn: qs("#refreshBtn"),
  logoutBtn: qs("#logoutBtn"),
  saveAccountSettingsBtn: qs("#saveAccountSettingsBtn"),
  settingsDomainInput: qs("#settingsDomainInput"),
  settingsTokenInput: qs("#settingsTokenInput"),
  accountStatus: qs("#accountStatus"),
  welcomeTitle: qs("#welcomeTitle"),
  welcomeCopy: qs("#welcomeCopy"),
  profileAvatar: qs("#profileAvatar"),
  profileName: qs("#profileName"),
  profileMeta: qs("#profileMeta"),
  overviewStats: qs("#overviewStats"),
  courseFilterList: qs("#courseFilterList"),
  priorityList: qs("#priorityList"),
  syncStamp: qs("#syncStamp"),
  calendarMonthLabel: qs("#calendarMonthLabel"),
  calendarGrid: qs("#calendarGrid"),
  calendarAgenda: qs("#calendarAgenda"),
  studioTabs: qsa(".studio-tab[data-tab]"),
  studioViews: qsa(".studio-view"),
  chatCourseSelect: qs("#chatCourseSelect"),
  chatMessages: qs("#chatMessages"),
  chatInput: qs("#chatInput"),
  chatSendBtn: qs("#chatSendBtn"),
  notesCourseSelect: qs("#notesCourseSelect"),
  notesFocusInput: qs("#notesFocusInput"),
  notesBtn: qs("#notesBtn"),
  notesOutput: qs("#notesOutput"),
  homeworkCourseSelect: qs("#homeworkCourseSelect"),
  homeworkAssignmentSelect: qs("#homeworkAssignmentSelect"),
  homeworkNeedInput: qs("#homeworkNeedInput"),
  homeworkWorkInput: qs("#homeworkWorkInput"),
  homeworkBtn: qs("#homeworkBtn"),
  homeworkOutput: qs("#homeworkOutput"),
  essayCourseSelect: qs("#essayCourseSelect"),
  essayModeSelect: qs("#essayModeSelect"),
  essayAssignmentSelect: qs("#essayAssignmentSelect"),
  essayExtraInput: qs("#essayExtraInput"),
  essayDraftInput: qs("#essayDraftInput"),
  essayBtn: qs("#essayBtn"),
  essayOutput: qs("#essayOutput"),
  scorerCourseSelect: qs("#scorerCourseSelect"),
  scorerAssignmentSelect: qs("#scorerAssignmentSelect"),
  scorerDraftInput: qs("#scorerDraftInput"),
  scorerBtn: qs("#scorerBtn"),
  scorerOutput: qs("#scorerOutput")
};

const runtimeConfig = window.CANVAS_ASSISTANT_CONFIG || {};

bindEvents();
boot();

function bindEvents() {
  elements.heroLoginBtn?.addEventListener("click", () => setAuthMode("login"));
  elements.heroSignupBtn?.addEventListener("click", () => setAuthMode("signup"));
  elements.authTabLogin?.addEventListener("click", () => setAuthMode("login"));
  elements.authTabSignup?.addEventListener("click", () => setAuthMode("signup"));
  elements.loginBtn?.addEventListener("click", handleLogin);
  elements.signupBtn?.addEventListener("click", handleSignup);
  elements.refreshBtn?.addEventListener("click", () => loadDashboard(false));
  elements.logoutBtn?.addEventListener("click", logout);
  elements.saveAccountSettingsBtn?.addEventListener("click", saveAccountSettings);
  elements.chatSendBtn?.addEventListener("click", sendChat);
  elements.notesBtn?.addEventListener("click", generateNotes);
  elements.homeworkBtn?.addEventListener("click", generateHomeworkHelp);
  elements.essayBtn?.addEventListener("click", generateEssayHelp);
  elements.scorerBtn?.addEventListener("click", scoreDraft);
  elements.homeworkCourseSelect?.addEventListener("change", renderHomeworkAssignments);
  elements.scorerCourseSelect?.addEventListener("change", renderScorerAssignments);
  elements.essayCourseSelect?.addEventListener("change", () => { renderEssayAssignments(); resetEssayCoach(); });
  elements.essayModeSelect?.addEventListener("change", resetEssayCoach);
  elements.essayAssignmentSelect?.addEventListener("change", resetEssayCoach);
  elements.essayExtraInput?.addEventListener("input", resetEssayCoach);
  elements.chatInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  });
  elements.studioTabs.forEach(tab => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));
}

async function boot() {
  setAuthMode(window.location.hash === "#signup" ? "signup" : "login");
  if (restoreSession()) {
    renderChatHistory();
    await loadDashboard(false);
    return;
  }

  showSetup();
  renderChatHistory();
  setStatus("idle", "Sign up once to save your Canvas connection. Future logins only need username and password.");
}

function restoreSession() {
  const username = normalizeUsername(localStorage.getItem(STORAGE_KEYS.currentUser));
  const account = getAccounts()[username];
  if (!username || !account) return false;

  applyAccountSession(username, account);
  return true;
}

function setAuthMode(mode) {
  const isLogin = mode !== "signup";
  elements.heroLoginBtn?.classList.toggle("active", isLogin);
  elements.heroSignupBtn?.classList.toggle("active", !isLogin);
  elements.authTabLogin?.classList.toggle("active", isLogin);
  elements.authTabSignup?.classList.toggle("active", !isLogin);
  elements.loginView?.classList.toggle("active", isLogin);
  elements.signupView?.classList.toggle("active", !isLogin);
  history.replaceState(null, "", isLogin ? "#login" : "#signup");
}

function showSetup() {
  elements.setupScreen.classList.remove("hidden");
  elements.dashboardScreen.classList.add("hidden");
}

function showDashboard() {
  elements.setupScreen.classList.add("hidden");
  elements.dashboardScreen.classList.remove("hidden");
}

async function handleLogin() {
  const username = normalizeUsername(elements.loginUsernameInput.value);
  const password = elements.loginPasswordInput.value.trim();
  const account = getAccounts()[username];

  if (!username || !password) {
    setStatus("error", "Username and password are required.");
    return;
  }

  if (!account) {
    setStatus("error", "That username does not exist.");
    return;
  }

  const passwordHash = await hashPassword(password, account.passwordSalt);
  if (passwordHash !== account.passwordHash) {
    setStatus("error", "Incorrect password.");
    return;
  }

  applyAccountSession(username, account);
  localStorage.setItem(STORAGE_KEYS.currentUser, username);
  elements.loginPasswordInput.value = "";
  await loadDashboard(true);
}

async function handleSignup() {
  const username = normalizeUsername(elements.signupUsernameInput.value);
  const password = elements.signupPasswordInput.value.trim();
  const canvasDomain = normalizeDomain(elements.signupDomainInput.value);
  const canvasToken = elements.signupTokenInput.value.trim();
  const accounts = getAccounts();

  if (!username || !password || !canvasDomain || !canvasToken) {
    setStatus("error", "Username, password, Canvas domain, and Canvas token are required.");
    return;
  }

  if (accounts[username]) {
    setStatus("error", "That username already exists.");
    return;
  }

  if (password.length < 6) {
    setStatus("error", "Choose a password with at least 6 characters.");
    return;
  }

  setStatus("loading", "Checking Canvas before creating your account...");
  const validation = await validateCanvasCredentials(canvasDomain, canvasToken);
  if (!validation.ok) {
    setStatus("error", validation.message);
    return;
  }

  const salt = createSalt();
  const now = new Date().toISOString();
  accounts[username] = {
    username,
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
    canvasDomain,
    canvasToken,
    createdAt: now,
    updatedAt: now
  };
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
  localStorage.setItem(STORAGE_KEYS.currentUser, username);

  applyAccountSession(username, accounts[username]);
  elements.signupPasswordInput.value = "";
  await loadDashboard(true);
}

function applyAccountSession(username, account) {
  state.currentUser = username;
  state.settings = { canvasDomain: account.canvasDomain || "", canvasToken: account.canvasToken || "" };
  state.hiddenCourses = readJson(userScopedKey("hiddenCourses"), []);
  state.chatHistory = readJson(userScopedKey("chatHistory"), []);
  state.essayCoach = null;
  elements.settingsDomainInput.value = state.settings.canvasDomain;
  elements.settingsTokenInput.value = state.settings.canvasToken;
}

async function saveAccountSettings() {
  const username = state.currentUser;
  const accounts = getAccounts();
  const account = accounts[username];
  const canvasDomain = normalizeDomain(elements.settingsDomainInput.value);
  const canvasToken = elements.settingsTokenInput.value.trim();

  if (!username || !account) {
    setAccountStatus("No active account is logged in.", true);
    return;
  }

  if (!canvasDomain || !canvasToken) {
    setAccountStatus("Canvas domain and token are required.", true);
    return;
  }

  setAccountStatus("Verifying updated Canvas settings...", false);
  const validation = await validateCanvasCredentials(canvasDomain, canvasToken);
  if (!validation.ok) {
    setAccountStatus(validation.message, true);
    return;
  }

  accounts[username] = {
    ...account,
    canvasDomain,
    canvasToken,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
  applyAccountSession(username, accounts[username]);
  setAccountStatus("Saved. Future logins will use the updated Canvas details.", false);
  await loadDashboard(false);
}

function setAccountStatus(message, isError) {
  elements.accountStatus.textContent = message;
  elements.accountStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

async function validateCanvasCredentials(canvasDomain, canvasToken) {
  try {
    const response = await fetch(apiUrl("/api/canvas/context"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvasDomain, canvasToken })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: data.error || "Failed to connect to Canvas." };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to connect to Canvas." };
  }
}

async function loadDashboard(fromAuth) {
  if (!state.settings.canvasDomain || !state.settings.canvasToken) {
    showSetup();
    setStatus("error", "This account is missing a saved Canvas domain or token.");
    return;
  }

  setStatus("loading", fromAuth ? "Connecting to Canvas and building your dashboard..." : "Refreshing Canvas data...");

  try {
    const response = await fetch(apiUrl("/api/canvas/context"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.settings)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load Canvas data.");

    state.context = data.context;
    state.essayCoach = null;
    const currentCourseIds = new Set((state.context.courses || []).map(course => String(course.id)));
    state.hiddenCourses = state.hiddenCourses.filter(id => currentCourseIds.has(id));
    localStorage.setItem(userScopedKey("hiddenCourses"), JSON.stringify(state.hiddenCourses));

    showDashboard();
    renderDashboard();
    setStatus("ok", `Canvas synced at ${formatTime(new Date())}.`);
  } catch (error) {
    showSetup();
    setStatus("error", error.message || "Canvas sync failed.");
  }
}

function renderDashboard() {
  renderHeader();
  renderOverview();
  renderCourseFilters();
  renderPriorityList();
  renderCalendar();
  renderSelectors();
  renderHomeworkAssignments();
  renderScorerAssignments();
  renderEssayAssignments();
  resetEssayCoach();
  renderChatHistory();
  elements.settingsDomainInput.value = state.settings.canvasDomain || "";
  elements.settingsTokenInput.value = state.settings.canvasToken || "";
  setAccountStatus("Saved changes update this account and keep future logins connected.", false);
}

function renderHeader() {
  const user = state.context?.user;
  const visible = visibleCourses();
  const welcomeName = user?.shortName || user?.name || state.currentUser || "Student";
  elements.welcomeTitle.textContent = `${welcomeName}'s Dashboard`;
  elements.welcomeCopy.textContent = `${visible.length} visible course${visible.length === 1 ? "" : "s"} connected across calendar, AI chat, notes, homework, essay coaching, and draft scoring.`;
  elements.profileName.textContent = user?.name || state.currentUser || "Canvas Student";
  elements.profileMeta.textContent = [`@${state.currentUser}`, state.context?.domain, user?.primaryEmail].filter(Boolean).join(" | ") || "Connected to Canvas";
  elements.profileAvatar.textContent = initials(user?.shortName || user?.name || state.currentUser || "Canvas Assistant");
  elements.syncStamp.textContent = `Last sync ${formatDateTime(state.context?.fetchedAt)}`;
}
function renderOverview() {
  const summary = state.context?.summary || {};
  const items = [
    { label: "Courses", value: visibleCourses().length },
    { label: "Upcoming", value: visibleAssignments().filter(item => !item.isSubmitted && !item.isMissing).length },
    { label: "Overdue", value: visibleAssignments().filter(item => item.isMissing).length },
    { label: "Tracked", value: visibleAssignments().length || summary.assignmentCount || 0 }
  ];
  elements.overviewStats.innerHTML = items.map(item => `
    <div class="summary-stat">
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function renderCourseFilters() {
  const courses = state.context?.courses || [];
  if (!courses.length) {
    elements.courseFilterList.innerHTML = '<div class="empty-state tight">No courses found.</div>';
    return;
  }

  elements.courseFilterList.innerHTML = courses.map(course => {
    const checked = !state.hiddenCourses.includes(String(course.id));
    return `
      <label class="filter-option">
        <input type="checkbox" value="${escapeHtml(course.id)}" ${checked ? "checked" : ""}>
        <span>${escapeHtml(course.name)}</span>
      </label>
    `;
  }).join("");

  elements.courseFilterList.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      state.hiddenCourses = qsa("#courseFilterList input").filter(box => !box.checked).map(box => String(box.value));
      localStorage.setItem(userScopedKey("hiddenCourses"), JSON.stringify(state.hiddenCourses));
      renderDashboard();
    });
  });
}

function renderPriorityList() {
  const urgent = visibleAssignments()
    .filter(item => !item.isSubmitted || item.isMissing)
    .sort((left, right) => new Date(left.due_at) - new Date(right.due_at))
    .slice(0, 5);

  elements.priorityList.innerHTML = urgent.length ? urgent.map(item => `
    <article class="priority-card ${urgencyClass(item)}">
      <div class="mini-kicker">${escapeHtml(item.courseName)}</div>
      <strong>${escapeHtml(item.name)}</strong>
      <div class="priority-meta">
        <span class="status-chip ${urgencyClass(item)}">${escapeHtml(priorityLabel(item))}</span>
        <span class="mini-copy">${escapeHtml(formatDateTime(item.due_at))}</span>
      </div>
      ${item.html_url ? `<a href="${escapeHtml(item.html_url)}" target="_blank" rel="noreferrer">Open in Canvas</a>` : ""}
    </article>
  `).join("") : '<div class="empty-state">No urgent work in the current course view.</div>';
}

function renderCalendar() {
  const base = firstRelevantDate();
  const month = base.getMonth();
  const start = startOfCalendarGrid(base.getFullYear(), month);
  elements.calendarMonthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(base);

  const assignmentsByDay = new Map();
  visibleAssignments().forEach(item => {
    const key = isoDay(item.due_at);
    const list = assignmentsByDay.get(key) || [];
    list.push(item);
    assignmentsByDay.set(key, list);
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`);
  for (let offset = 0; offset < 42; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const items = (assignmentsByDay.get(isoDay(date)) || []).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    const classes = ["calendar-day", calendarHeatClass(items.length)];
    if (date.getMonth() !== month) classes.push("is-outside");
    if (isoDay(date) === isoDay(new Date())) classes.push("is-today");
    cells.push(`
      <div class="${classes.join(" ")}">
        <div class="calendar-day-number">${date.getDate()}</div>
        <div class="calendar-stack">
          ${items.slice(0, 3).map(item => `
            <div class="assignment-pill ${urgencyClass(item)}">
              <div class="assignment-pill-name">${escapeHtml(item.name)}</div>
              <div class="assignment-pill-course">${escapeHtml(item.courseName)}</div>
            </div>
          `).join("")}
          ${items.length > 3 ? `<div class="mini-copy">+${items.length - 3} more</div>` : ""}
        </div>
      </div>
    `);
  }
  elements.calendarGrid.innerHTML = cells.join("");

  const agendaItems = visibleAssignments()
    .filter(item => isWithinNextDays(item.due_at, 14) || item.isMissing)
    .sort((left, right) => new Date(left.due_at) - new Date(right.due_at))
    .slice(0, 8);
  elements.calendarAgenda.innerHTML = agendaItems.length ? agendaItems.map(renderAssignmentCard).join("") : '<div class="empty-state">No assignments due in the next two weeks.</div>';
}

function renderSelectors() {
  const courses = visibleCourses();
  const homeworkCourses = courses.filter(course => course.assignments.some(item => !item.isSubmitted));
  const generalOptions = courseOptionsHtml(courses, "No visible courses");
  const homeworkOptions = courseOptionsHtml(homeworkCourses, "No active homework courses");

  elements.chatCourseSelect.innerHTML = `<option value="">All visible courses</option>${courses.map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`).join("")}`;
  elements.notesCourseSelect.innerHTML = generalOptions;
  elements.essayCourseSelect.innerHTML = generalOptions;
  elements.scorerCourseSelect.innerHTML = generalOptions;
  elements.homeworkCourseSelect.innerHTML = homeworkOptions;
}

function renderHomeworkAssignments() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.homeworkCourseSelect.value));
  const assignments = (course?.assignments || []).filter(item => !item.isSubmitted).sort((left, right) => new Date(left.due_at) - new Date(right.due_at));
  elements.homeworkAssignmentSelect.innerHTML = assignments.length ? assignments.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("") : '<option value="">No unfinished assignments</option>';
}

function renderScorerAssignments() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.scorerCourseSelect.value));
  const assignments = (course?.analysisAssignments || []).filter(item => item.description || (item.rubricSummary || []).length);
  elements.scorerAssignmentSelect.innerHTML = assignments.length ? assignments.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("") : '<option value="">No rubric-ready assignments</option>';
}

function renderEssayAssignments() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.essayCourseSelect.value));
  const assignments = (course?.analysisAssignments || []).filter(item => item.description || (item.rubricSummary || []).length);
  elements.essayAssignmentSelect.innerHTML = assignments.length ? assignments.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("") : '<option value="">No Canvas essay assignment selected</option>';
}

async function sendChat() {
  const input = elements.chatInput.value.trim();
  if (!input || !state.context) return;

  const focusCourse = selectedChatCourse();
  elements.chatInput.value = "";
  appendChatMessage("user", input);
  state.chatHistory.push({ role: "user", content: input, courseId: focusCourse?.id || null });
  persistChatHistory();

  const thinkingNode = appendChatMessage("assistant", "Thinking...");
  try {
    const response = await requestAi(systemPrompt("chat", focusCourse), state.chatHistory.slice(-10).map(entry => ({ role: entry.role, content: entry.content })));
    thinkingNode.remove();
    appendChatMessage("assistant", response.reply, true);
    state.chatHistory.push({ role: "assistant", content: response.reply, courseId: focusCourse?.id || null });
    persistChatHistory();
  } catch (error) {
    thinkingNode.remove();
    appendChatMessage("assistant", `Error: ${error.message}`);
  }
}

async function generateNotes() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.notesCourseSelect.value));
  if (!course) {
    renderResult(elements.notesOutput, "Select a visible course first.");
    return;
  }

  renderLoading(elements.notesOutput, "Generating study notes...");
  const prompt = [
    `Create study notes for the course \"${course.name}\".`,
    elements.notesFocusInput.value.trim() ? `Focus area: ${elements.notesFocusInput.value.trim()}.` : "Focus on the most urgent and recurring course themes.",
    `Professor patterns to keep in mind: ${buildProfessorMemory(course).join(" | ")}.`,
    "Use assignments and announcements to identify key concepts, likely review areas, deadlines, and missing work.",
    "Organize the response with headings, compact bullet points, and a short last-minute review checklist."
  ].join(" ");

  try {
    const response = await requestAi(systemPrompt("notes", course), [{ role: "user", content: prompt }]);
    renderResult(elements.notesOutput, response.reply, true);
  } catch (error) {
    renderResult(elements.notesOutput, error.message);
  }
}

async function generateHomeworkHelp() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.homeworkCourseSelect.value));
  const assignment = (course?.assignments || []).find(item => String(item.id) === String(elements.homeworkAssignmentSelect.value));
  const need = elements.homeworkNeedInput.value.trim();
  const work = elements.homeworkWorkInput.value.trim();
  if (!course || !assignment || !need) {
    renderResult(elements.homeworkOutput, "Select a course, choose an assignment, and describe what you need help with.");
    return;
  }

  renderLoading(elements.homeworkOutput, "Building assignment help...");
  const prompt = [
    `Course: ${course.name}`,
    `Assignment: ${assignment.name}`,
    `Due: ${formatDateTime(assignment.due_at)}`,
    `Expected submission: ${assignment.actionLabel}`,
    `Assignment description: ${assignment.description || "Not provided in Canvas."}`,
    assignment.rubricSummary?.length ? `Rubric signals: ${assignment.rubricSummary.join(" | ")}` : "",
    `Student needs help with: ${need}`,
    work ? `Student work or prompt:\n${work}` : "",
    "Explain the approach clearly. If this is quantitative, show the steps and logic. If it is writing-heavy, help structure the response rather than pretending the work is already complete."
  ].filter(Boolean).join("\n\n");

  try {
    const response = await requestAi(systemPrompt("homework", course), [{ role: "user", content: prompt }]);
    renderResult(elements.homeworkOutput, response.reply, true);
  } catch (error) {
    renderResult(elements.homeworkOutput, error.message);
  }
}
async function generateEssayHelp() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.essayCourseSelect.value));
  const assignment = (course?.analysisAssignments || []).find(item => String(item.id) === String(elements.essayAssignmentSelect.value));
  const mode = elements.essayModeSelect.value;
  const extraContext = elements.essayExtraInput.value.trim();
  const draftOrAnswers = elements.essayDraftInput.value.trim();
  if (!course || !assignment) {
    renderResult(elements.essayOutput, "Choose a course and select a Canvas assignment first.");
    return;
  }

  const assignmentContext = [
    `Assignment: ${assignment.name}`,
    assignment.description ? `Canvas assignment details:\n${assignment.description}` : "",
    assignment.rubricSummary?.length ? `Canvas rubric:\n- ${assignment.rubricSummary.join("\n- ")}` : "",
    extraContext ? `Optional extra context not in Canvas:\n${extraContext}` : ""
  ].filter(Boolean).join("\n\n");

  const coachKey = `${course.id}:${assignment.id}:${mode}:${extraContext}`;
  const professorMemory = buildProfessorMemory(course).join(" | ");

  if (!state.essayCoach || state.essayCoach.key !== coachKey) {
    renderLoading(elements.essayOutput, "Preparing assignment-specific coaching questions...");
    const prompt = [
      `Course: ${course.name}`,
      `Essay task: ${mode}`,
      assignmentContext,
      `Professor patterns to remember: ${professorMemory}`,
      "Ask 4 to 6 short, specific questions that make the student think through the argument, evidence, citations, and priorities before drafting.",
      "Questions should sound like prompts a real tutor would ask, not a final answer."
    ].join("\n\n");

    try {
      const response = await requestAi(systemPrompt("essay_questions", course), [{ role: "user", content: prompt }]);
      state.essayCoach = { key: coachKey, courseId: course.id, assignmentId: assignment.id, mode };
      elements.essayBtn.textContent = "Build From My Answers";
      renderResult(elements.essayOutput, response.reply, true);
    } catch (error) {
      renderResult(elements.essayOutput, error.message);
    }
    return;
  }

  if (!draftOrAnswers) {
    renderResult(elements.essayOutput, "Answer the coaching questions in the draft box, then click again to build the essay help.");
    return;
  }

  renderLoading(elements.essayOutput, "Building essay help from your answers...");
  const prompt = [
    `Course: ${course.name}`,
    `Essay task: ${mode}`,
    assignmentContext,
    `Professor patterns to remember: ${professorMemory}`,
    `Student answers, notes, or draft:\n${draftOrAnswers}`,
    "Use the student's own answers and wording choices as the base. Keep the output realistic, student-like, and aligned with the assignment.",
    "Return a response that improves the work while preserving the student's thinking. Include what to keep, what to revise, and a stronger version or outline only where useful."
  ].join("\n\n");

  try {
    const response = await requestAi(systemPrompt("essay_build", course), [{ role: "user", content: prompt }]);
    renderResult(elements.essayOutput, response.reply, true);
  } catch (error) {
    renderResult(elements.essayOutput, error.message);
  }
}

async function scoreDraft() {
  const course = visibleCourses().find(item => String(item.id) === String(elements.scorerCourseSelect.value));
  const assignment = (course?.analysisAssignments || []).find(item => String(item.id) === String(elements.scorerAssignmentSelect.value));
  const draft = elements.scorerDraftInput.value.trim();
  if (!course || !assignment || !draft) {
    renderResult(elements.scorerOutput, "Select a course, choose an assignment, and paste a draft to score.");
    return;
  }

  renderLoading(elements.scorerOutput, "Scoring draft against rubric and professor signals...");
  const prompt = [
    `Course: ${course.name}`,
    `Assignment: ${assignment.name}`,
    assignment.description ? `Assignment description:\n${assignment.description}` : "",
    assignment.rubricSummary?.length ? `Rubric criteria:\n- ${assignment.rubricSummary.join("\n- ")}` : "No explicit rubric was found; infer expectations from assignment language and announcements.",
    `Professor patterns to remember: ${buildProfessorMemory(course).join(" | ")}`,
    `Student draft:\n${draft}`,
    "Score the draft on a 100-point scale using the rubric and repeated professor expectations from the course context.",
    "Return: 1) score with brief rationale, 2) what is missing, 3) what already works, 4) prioritized revisions before submission."
  ].filter(Boolean).join("\n\n");

  try {
    const response = await requestAi(systemPrompt("scorer", course), [{ role: "user", content: prompt }]);
    renderResult(elements.scorerOutput, response.reply, true);
  } catch (error) {
    renderResult(elements.scorerOutput, error.message);
  }
}

async function requestAi(systemPromptText, messages) {
  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt: systemPromptText, messages })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "AI request failed.");
  return data;
}

function systemPrompt(mode, focusCourse) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const visible = focusCourse ? [focusCourse] : visibleCourses();
  const courseData = visible.map(course => formatCourseForPrompt(course)).join("\n\n");
  const modeInstruction = {
    chat: "Answer direct questions about workload, deadlines, risk, and concepts. When the user asks to explain a concept, use the selected course's terminology, assignments, rubric cues, and announcements instead of giving a generic textbook answer.",
    notes: "Generate concise but thorough study notes grounded in the actual course data and keep professor patterns in mind.",
    homework: "Coach the student through unfinished assignments. Be explicit with steps and reasoning.",
    essay_questions: "Ask assignment-specific coaching questions that help the student think before writing. Do not generate the essay yet.",
    essay_build: "Build essay help from the student's own answers and notes. Keep the output realistic, student-like, and aligned with the professor's repeated expectations.",
    scorer: "Evaluate the pasted draft against the assignment rubric and repeated professor expectations from the course context. Focus on what is missing, what is strong, and how to improve before submission."
  }[mode] || "Support the student using the course context below.";
  const focusLine = focusCourse ? `Focus on ${focusCourse.name}.` : "Use the full visible course set.";

  return [
    "You are Canvas Assistant, an academic support AI grounded in a student's live Canvas context.",
    `Today is ${today}.`,
    focusLine,
    modeInstruction,
    "If data is missing, say so plainly. Do not invent assignment requirements, rubric criteria, or source material.",
    "Visible course data:",
    courseData
  ].join("\n\n");
}

function formatCourseForPrompt(course) {
  const memory = buildProfessorMemory(course);
  const assignments = (course.analysisAssignments || []).slice(0, 20).map(item => {
    const rubric = (item.rubricSummary || []).length ? `  Rubric: ${(item.rubricSummary || []).join(" | ")}` : "";
    return [
      `- ${item.name}`,
      item.due_at ? `  Due: ${formatDateTime(item.due_at)}` : "  Due: not listed",
      `  Status: ${item.isMissing ? "missing" : item.isSubmitted ? "submitted" : "not submitted"}`,
      `  Submission: ${item.actionLabel}`,
      item.description ? `  Description: ${item.description.slice(0, 600)}` : "",
      rubric
    ].filter(Boolean).join("\n");
  }).join("\n");
  const announcements = (course.announcements || []).slice(0, 8).map(item => `- ${item.title} (${formatDate(item.posted_at)}): ${item.message.slice(0, 350)}`).join("\n");

  return [
    `## ${course.name} (${course.code || "No code"})`,
    `Professor memory: ${memory.join(" | ")}`,
    "Assignments and rubric signals:",
    assignments || "- None",
    "Announcements:",
    announcements || "- None"
  ].join("\n");
}

function buildProfessorMemory(course) {
  const text = [
    ...(course.announcements || []).map(item => `${item.title} ${item.message}`),
    ...(course.analysisAssignments || []).flatMap(item => [item.name, item.description || "", ...(item.rubricSummary || [])])
  ].join(" ").toLowerCase();
  const memory = [];
  if (/(citation|mla|apa|works cited|references|sources|scholarly)/.test(text)) memory.push("Citations and source quality seem to matter a lot.");
  if (/(real-world|real world|application|practical example|case study)/.test(text)) memory.push("Real-world applications or examples appear to be rewarded.");
  if (/(thesis|argument|claim|analysis|interpretation)/.test(text)) memory.push("Clear argumentation and analysis appear more important than summary.");
  if (/(evidence|support|quote|textual evidence|data)/.test(text)) memory.push("Claims usually need evidence, examples, or support.");
  if (/(clarity|organization|structure|coherent|grammar)/.test(text)) memory.push("Organization and writing clarity show up repeatedly in expectations.");
  if (/(discussion|reflection|respond|peer)/.test(text)) memory.push("The instructor seems to value reflection or direct engagement with prompts and peers.");
  if (!memory.length) memory.push("Recurring expectations are subtle, so rely closely on the assignment prompt and rubric wording.");
  return memory.slice(0, 4);
}

function renderChatHistory() {
  elements.chatMessages.innerHTML = "";
  if (!state.chatHistory.length) {
    appendChatMessage("assistant", "Ask about your deadlines, risky classes, missing submissions, or explain a concept using a selected course context.");
    return;
  }
  state.chatHistory.forEach(entry => appendChatMessage(entry.role === "user" ? "user" : "assistant", entry.content, entry.role !== "user"));
}

function appendChatMessage(role, text, markdown) {
  const row = document.createElement("div");
  row.className = `chat-row ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = markdown ? renderMarkdown(text) : escapeHtml(text).replace(/\n/g, "<br>");
  row.appendChild(bubble);
  elements.chatMessages.appendChild(row);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return row;
}

function renderResult(target, text, markdown) {
  target.innerHTML = `<div class="result-card">${markdown ? renderMarkdown(text) : escapeHtml(text)}</div>`;
}

function renderLoading(target, text) {
  target.innerHTML = `<div class="result-card">${escapeHtml(text)}</div>`;
}

function renderMarkdown(value) {
  const escaped = escapeHtml(value);
  const lines = escaped.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }
    if (/^###\s+/.test(line)) { if (inList) { html += "</ul>"; inList = false; } html += `<h3>${inlineMarkdown(line.replace(/^###\s+/, ""))}</h3>`; continue; }
    if (/^##\s+/.test(line)) { if (inList) { html += "</ul>"; inList = false; } html += `<h2>${inlineMarkdown(line.replace(/^##\s+/, ""))}</h2>`; continue; }
    if (/^#\s+/.test(line)) { if (inList) { html += "</ul>"; inList = false; } html += `<h1>${inlineMarkdown(line.replace(/^#\s+/, ""))}</h1>`; continue; }
    if (/^-\s+/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inlineMarkdown(line.replace(/^-\s+/, ""))}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${inlineMarkdown(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html || "<p>No content returned.</p>";
}

function inlineMarkdown(value) {
  return value.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
function apiUrl(path) {
  const configuredBase = String(runtimeConfig.apiBaseUrl || "").trim();
  if (!configuredBase) return path;
  return `${configuredBase.replace(/\/+$/, "")}${path}`;
}
function resetEssayCoach() {
  state.essayCoach = null;
  if (elements.essayBtn) elements.essayBtn.textContent = "Start Essay Coaching";
}

function setStatus(type, message) {
  elements.statusBar.className = `status-bar ${type}`;
  elements.statusBar.textContent = message;
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  state.context = null;
  state.currentUser = "";
  state.settings = { canvasDomain: "", canvasToken: "" };
  state.hiddenCourses = [];
  state.chatHistory = [];
  state.essayCoach = null;
  elements.loginPasswordInput.value = "";
  [elements.notesOutput, elements.homeworkOutput, elements.essayOutput, elements.scorerOutput].forEach(node => {
    if (node) node.innerHTML = "";
  });
  showSetup();
  setAuthMode("login");
  renderChatHistory();
  setStatus("idle", "Signed out. Log back in with username and password to restore your saved Canvas connection.");
}

function setActiveTab(tabId) {
  elements.studioTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabId));
  elements.studioViews.forEach(view => view.classList.toggle("active", view.id === `tab-${tabId}`));
}

function courseOptionsHtml(courses, emptyLabel) {
  if (!courses.length) return `<option value="">${escapeHtml(emptyLabel)}</option>`;
  return courses.map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`).join("");
}

function visibleCourses() {
  return (state.context?.courses || []).filter(course => !state.hiddenCourses.includes(String(course.id)));
}

function visibleAssignments() {
  return visibleCourses().flatMap(course => (course.assignments || []).map(assignment => ({ ...assignment, courseId: course.id, courseName: course.name, courseCode: course.code })));
}

function selectedChatCourse() {
  return visibleCourses().find(course => String(course.id) === String(elements.chatCourseSelect.value)) || null;
}

function renderAssignmentCard(item) {
  return `
    <article class="assignment-card">
      <div class="assignment-course">${escapeHtml(item.courseName)}</div>
      <div class="assignment-name">${escapeHtml(item.name)}</div>
      <div class="assignment-meta">
        <span class="status-chip ${urgencyClass(item)}">${escapeHtml(priorityLabel(item))}</span>
        <span class="mini-copy">${escapeHtml(formatDateTime(item.due_at))}</span>
      </div>
      <div class="mini-copy">${escapeHtml(item.description || item.actionLabel || "No assignment description available.")}</div>
      <div class="assignment-links">
        <span class="mini-copy">${escapeHtml(item.actionLabel)}</span>
        ${item.html_url ? `<a href="${escapeHtml(item.html_url)}" target="_blank" rel="noreferrer">Open in Canvas</a>` : ""}
      </div>
    </article>
  `;
}

function calendarHeatClass(count) {
  if (count >= 4) return "heat-4";
  if (count === 3) return "heat-3";
  if (count === 2) return "heat-2";
  if (count === 1) return "heat-1";
  return "heat-0";
}

function urgencyClass(item) {
  if (item.isMissing) return "urgent";
  const days = daysUntil(item.due_at);
  if (days <= 1) return "urgent";
  if (days <= 4) return "soon";
  return "ok";
}

function priorityLabel(item) {
  if (item.isMissing) return "Overdue";
  const days = daysUntil(item.due_at);
  if (days < 0) return "Past due";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

function daysUntil(value) {
  const target = new Date(value);
  return Math.floor((target.getTime() - Date.now()) / 86400000);
}

function firstRelevantDate() {
  const upcoming = visibleAssignments().filter(item => !item.isSubmitted || item.isMissing).sort((left, right) => new Date(left.due_at) - new Date(right.due_at))[0];
  return upcoming ? new Date(upcoming.due_at) : new Date();
}

function startOfCalendarGrid(year, month) {
  const start = new Date(year, month, 1);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function isWithinNextDays(value, days) {
  const target = new Date(value).getTime();
  const now = Date.now();
  return target >= now - 86400000 && target <= now + days * 86400000;
}

function isoDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function initials(value) {
  return String(value || "CA").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join("") || "CA";
}

function persistChatHistory() {
  localStorage.setItem(userScopedKey("chatHistory"), JSON.stringify(state.chatHistory.slice(-20)));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getAccounts() {
  const raw = readJson(STORAGE_KEYS.accounts, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

function userScopedKey(suffix) {
  return `canvasDashboard:${state.currentUser || "guest"}:${suffix}`;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDomain(value) {
  return String(value || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }









