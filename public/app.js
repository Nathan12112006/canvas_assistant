 
const STORAGE_KEYS = {
  sessionToken: "canvasDashboardSessionToken"
};

const USER_SCOPED_SUFFIXES = [
  "hiddenCourses",
  "completedAssignments",
  "customEvents",
  "chatHistory",
  "userMemory"
];

const CHAT_MEMORY_LIMIT = 16;

const state = {
  context: null,
  currentUser: "",
  sessionToken: "",
  settings: { canvasDomain: "", hasCanvasToken: false },
  hiddenCourses: [],
  completedAssignments: [],
  customEvents: [],
  chatHistory: [],
  userMemory: createEmptyUserMemory(),
  essayCoach: null,
  calendarMonthCursor: null,
  dashboardTab: "planner"
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
  dashboardTabs: qsa(".dashboard-tab[data-dashboard-tab]"),
  dashboardViews: qsa(".dashboard-view"),
  saveAccountSettingsBtn: qs("#saveAccountSettingsBtn"),
  saveProfileSettingsBtn: qs("#saveProfileSettingsBtn"),
  settingsUsernameInput: qs("#settingsUsernameInput"),
  settingsPasswordInput: qs("#settingsPasswordInput"),
  settingsDomainInput: qs("#settingsDomainInput"),
  settingsTokenInput: qs("#settingsTokenInput"),
  accountStatus: qs("#accountStatus"),
  profileSettingsStatus: qs("#profileSettingsStatus"),
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
  calendarMonthSelect: qs("#calendarMonthSelect"),
  calendarPrevMonthBtn: qs("#calendarPrevMonthBtn"),
  calendarNextMonthBtn: qs("#calendarNextMonthBtn"),
  calendarEventTitle: qs("#calendarEventTitle"),
  calendarEventDateTime: qs("#calendarEventDateTime"),
  calendarEventNotes: qs("#calendarEventNotes"),
  addCalendarEventBtn: qs("#addCalendarEventBtn"),
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
  elements.dashboardTabs.forEach(tab => tab.addEventListener("click", () => setDashboardTab(tab.dataset.dashboardTab)));
  elements.saveAccountSettingsBtn?.addEventListener("click", saveAccountSettings);
  elements.saveProfileSettingsBtn?.addEventListener("click", saveProfileSettings);
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
  elements.addCalendarEventBtn?.addEventListener("click", addCalendarEvent);
  elements.calendarPrevMonthBtn?.addEventListener("click", () => shiftCalendarMonth(-1));
  elements.calendarNextMonthBtn?.addEventListener("click", () => shiftCalendarMonth(1));
  elements.calendarMonthSelect?.addEventListener("change", handleCalendarMonthSelect);
  elements.priorityList?.addEventListener("click", handleAssignmentToggleClick);
  elements.calendarAgenda?.addEventListener("click", handleCalendarAgendaClick);
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
  if (await restoreSession()) {
    renderChatHistory();
    await loadDashboard(false);
    return;
  }

  showSetup();
  renderChatHistory();
  setStatus("idle", "Sign up once to save your Canvas connection. Future logins only need username and password.");
}

async function restoreSession() {
  const sessionToken = String(localStorage.getItem(STORAGE_KEYS.sessionToken) || "").trim();
  if (!sessionToken) return false;

  try {
    const data = await authFetch("/api/auth/session", { method: "GET" }, sessionToken);
    applyAccountSession(data.account.username, data.account, sessionToken);
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.sessionToken);
    return false;
  }
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
  setDashboardTab(state.dashboardTab || "planner");
}

async function handleLogin() {
  const username = normalizeUsername(elements.loginUsernameInput.value);
  const password = elements.loginPasswordInput.value.trim();

  if (!username || !password) {
    setStatus("error", "Username and password are required.");
    return;
  }

  setStatus("loading", "Logging in...");

  try {
    const data = await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    applyAccountSession(data.account.username, data.account, data.token);
    localStorage.setItem(STORAGE_KEYS.sessionToken, data.token);
    elements.loginPasswordInput.value = "";
    await loadDashboard(true);
  } catch (error) {
    setStatus("error", error.message || "Login failed.");
  }
}

async function handleSignup() {
  const username = normalizeUsername(elements.signupUsernameInput.value);
  const password = elements.signupPasswordInput.value.trim();
  const canvasDomain = normalizeDomain(elements.signupDomainInput.value);
  const canvasToken = elements.signupTokenInput.value.trim();

  if (!username || !password || !canvasDomain || !canvasToken) {
    setStatus("error", "Username, password, Canvas domain, and Canvas token are required.");
    return;
  }

  if (password.length < 6) {
    setStatus("error", "Choose a password with at least 6 characters.");
    return;
  }

  setStatus("loading", "Checking Canvas before creating your account...");

  try {
    const data = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, canvasDomain, canvasToken })
    });

    applyAccountSession(data.account.username, data.account, data.token);
    localStorage.setItem(STORAGE_KEYS.sessionToken, data.token);
    elements.signupPasswordInput.value = "";
    elements.signupTokenInput.value = "";
    await loadDashboard(true);
  } catch (error) {
    setStatus("error", error.message || "Signup failed.");
  }
}

function applyAccountSession(username, account, sessionToken = state.sessionToken) {
  state.currentUser = username;
  state.sessionToken = String(sessionToken || "");
  state.settings = {
    canvasDomain: account.canvasDomain || "",
    hasCanvasToken: Boolean(account.hasCanvasToken)
  };
  state.hiddenCourses = readJson(userScopedKey("hiddenCourses"), []);
  state.completedAssignments = readJson(userScopedKey("completedAssignments"), []);
  state.customEvents = normalizeCustomItems(readJson(userScopedKey("customEvents"), []));
  state.chatHistory = readJson(userScopedKey("chatHistory"), []);
  state.userMemory = normalizeUserMemory(readJson(userScopedKey("userMemory"), createEmptyUserMemory()));
  state.essayCoach = null;
  state.dashboardTab = "planner";
  elements.settingsUsernameInput.value = username;
  elements.settingsPasswordInput.value = "";
  elements.settingsDomainInput.value = state.settings.canvasDomain;
  elements.settingsTokenInput.value = "";
}

async function saveAccountSettings() {
  const canvasDomain = normalizeDomain(elements.settingsDomainInput.value);
  const canvasToken = elements.settingsTokenInput.value.trim();

  if (!state.currentUser || !state.sessionToken) {
    setAccountStatus("No active account is logged in.", true);
    return;
  }

  if (!canvasDomain) {
    setAccountStatus("Canvas domain is required.", true);
    return;
  }

  setAccountStatus("Verifying updated Canvas settings...", false);

  try {
    const data = await authFetch("/api/auth/update-canvas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvasDomain, canvasToken })
    });
    applyAccountSession(data.account.username, data.account, state.sessionToken);
    setAccountStatus(
      canvasToken
        ? "Saved. Future logins will use the updated Canvas details."
        : "Saved. Existing stored token was kept.",
      false
    );
    await loadDashboard(false);
  } catch (error) {
    setAccountStatus(error.message || "Canvas update failed.", true);
  }
}

async function saveProfileSettings() {
  const currentUsername = state.currentUser;
  const nextUsername = normalizeUsername(elements.settingsUsernameInput.value);
  const nextPassword = elements.settingsPasswordInput.value.trim();

  if (!currentUsername || !state.sessionToken) {
    setProfileSettingsStatus("No active account is logged in.", true);
    return;
  }

  if (!nextUsername) {
    setProfileSettingsStatus("Username is required.", true);
    return;
  }

  if (nextPassword && nextPassword.length < 6) {
    setProfileSettingsStatus("Choose a password with at least 6 characters.", true);
    return;
  }

  try {
    const data = await authFetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nextUsername, password: nextPassword })
    });

    if (nextUsername !== currentUsername) {
      migrateUserScopedStorage(currentUsername, nextUsername);
    }

    localStorage.setItem(STORAGE_KEYS.sessionToken, data.token);
    applyAccountSession(nextUsername, data.account, data.token);
    state.dashboardTab = "settings";
    renderDashboard();

    setProfileSettingsStatus(
      nextPassword
        ? "Saved your username and password."
        : "Saved your username.",
      false
    );
  } catch (error) {
    setProfileSettingsStatus(error.message || "Profile update failed.", true);
  }
}

function setAccountStatus(message, isError) {
  elements.accountStatus.textContent = message;
  elements.accountStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setProfileSettingsStatus(message, isError) {
  elements.profileSettingsStatus.textContent = message;
  elements.profileSettingsStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

async function loadDashboard(fromAuth) {
  if (!state.settings.canvasDomain || !state.sessionToken) {
    showSetup();
    setStatus("error", "This account is missing a saved session or Canvas connection.");
    return;
  }

  setStatus("loading", fromAuth ? "Connecting to Canvas and building your dashboard..." : "Refreshing Canvas data...");

  try {
    const data = await authFetch("/api/canvas/context", { method: "POST" });

    state.context = data.context;
    state.essayCoach = null;
    state.calendarMonthCursor = null;
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
  elements.settingsUsernameInput.value = state.currentUser || "";
  elements.settingsPasswordInput.value = "";
  elements.settingsDomainInput.value = state.settings.canvasDomain || "";
  elements.settingsTokenInput.value = "";
  setProfileSettingsStatus("Update your login details here. Existing dashboard data will follow your account if the username changes.", false);
  setAccountStatus("Saved changes update this account. Leave the token blank to keep the stored token.", false);
  setDashboardTab(state.dashboardTab || "planner");
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
  const activeAssignments = actionableAssignments();
  const personalTasks = customCalendarEvents();
  const completedCount = visibleAssignments().filter(item => item.isSubmitted || item.isManuallyCompleted).length
    + personalTasks.filter(item => item.isCompleted).length;
  const items = [
    { label: "Courses", value: visibleCourses().length },
    { label: "Upcoming", value: activeAssignments.filter(item => !item.isMissing).length },
    { label: "Overdue", value: activeAssignments.filter(item => item.isMissing).length },
    { label: "Tracked", value: visibleAssignments().length || summary.assignmentCount || 0 },
    { label: "Completed", value: completedCount },
    { label: "Personal Tasks", value: personalTasks.length }
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
  const urgent = [
    ...actionableAssignments().map(item => ({ ...item, itemType: "assignment" })),
    ...customCalendarEvents()
      .filter(item => !item.isCompleted)
      .map(item => ({ ...item, itemType: "event" }))
  ]
    .sort((left, right) => itemDateValue(left) - itemDateValue(right))
    .slice(0, 5);

  elements.priorityList.innerHTML = urgent.length ? urgent.map(item => `
    <article class="priority-card ${calendarItemClass(item)}">
      <div class="mini-kicker">${escapeHtml(item.itemType === "event" ? "Personal Task" : item.courseName)}</div>
      <strong>${escapeHtml(itemDisplayName(item))}</strong>
      <div class="priority-meta">
        <span class="status-chip ${calendarItemClass(item)}">${escapeHtml(priorityLabel(item))}</span>
        <span class="mini-copy">${escapeHtml(formatDateTime(itemDateField(item)))}</span>
      </div>
      <div class="assignment-actions">
        ${item.itemType === "event"
          ? `<button class="ghost-btn assignment-toggle-btn" data-event-id="${escapeHtml(item.id)}" data-action="toggle-event" type="button">${item.isCompleted ? "Mark Active" : "Mark Complete"}</button>`
          : `<button class="ghost-btn assignment-toggle-btn" data-course-id="${escapeHtml(item.courseId)}" data-assignment-id="${escapeHtml(item.id)}" type="button">${item.isManuallyCompleted ? "Mark Active" : "Mark Complete"}</button>`
        }
        ${item.html_url ? `<a href="${escapeHtml(item.html_url)}" target="_blank" rel="noreferrer">Open in Canvas</a>` : ""}
      </div>
    </article>
  `).join("") : '<div class="empty-state">No urgent work or personal tasks in the current course view.</div>';
}

function renderCalendar() {
  const base = calendarBaseDate();
  const month = base.getMonth();
  const start = startOfCalendarGrid(base.getFullYear(), month);
  renderCalendarMonthControls(base);
  elements.calendarMonthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(base);

  const itemsByDay = new Map();
  visibleAssignments().forEach(item => {
    const key = isoDay(item.due_at);
    const list = itemsByDay.get(key) || [];
    list.push({ ...item, itemType: "assignment" });
    itemsByDay.set(key, list);
  });
  customCalendarEvents().forEach(item => {
    const key = isoDay(item.startsAt);
    const list = itemsByDay.get(key) || [];
    list.push({ ...item, itemType: "event" });
    itemsByDay.set(key, list);
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`);
  for (let offset = 0; offset < 42; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const items = (itemsByDay.get(isoDay(date)) || []).sort((a, b) => itemDateValue(a) - itemDateValue(b));
    const classes = ["calendar-day", calendarHeatClass(items.length)];
    if (date.getMonth() !== month) classes.push("is-outside");
    if (isoDay(date) === isoDay(new Date())) classes.push("is-today");
    cells.push(`
      <div class="${classes.join(" ")}">
        <div class="calendar-day-number">${date.getDate()}</div>
        <div class="calendar-stack">
          ${items.slice(0, 3).map(item => `
            <div class="assignment-pill ${calendarItemClass(item)} ${isCalendarItemComplete(item) ? "is-complete" : ""}">
              <div class="assignment-pill-name">${escapeHtml(itemDisplayName(item))}</div>
              <div class="assignment-pill-course">${escapeHtml(itemDisplayMeta(item))}</div>
            </div>
          `).join("")}
          ${items.length > 3 ? `<div class="mini-copy">+${items.length - 3} more</div>` : ""}
        </div>
      </div>
    `);
  }
  elements.calendarGrid.innerHTML = cells.join("");

  const agendaItems = [
    ...visibleAssignments()
      .filter(item => isInCalendarMonth(item.due_at, base) && (!item.isSubmitted || item.isManuallyCompleted || item.isMissing))
      .map(item => ({ ...item, itemType: "assignment" })),
    ...customCalendarEvents()
      .filter(item => isInCalendarMonth(item.startsAt, base))
      .map(item => ({ ...item, itemType: "event" }))
  ]
    .sort((left, right) => itemDateValue(left) - itemDateValue(right))
    .slice(0, 8);
  elements.calendarAgenda.innerHTML = agendaItems.length ? agendaItems.map(renderCalendarAgendaCard).join("") : '<div class="empty-state">No assignments or personal tasks in this month.</div>';
}

function renderSelectors() {
  const courses = visibleCourses();
  const homeworkCourses = courses.filter(course => course.assignments.some(item => !item.isSubmitted && !isAssignmentMarkedComplete(course.id, item.id)));
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
  const assignments = (course?.assignments || []).filter(item => !item.isSubmitted && !isAssignmentMarkedComplete(course.id, item.id)).sort((left, right) => new Date(left.due_at) - new Date(right.due_at));
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
  rememberUserText(input, { source: "chat", courseId: focusCourse?.id || null });

  const thinkingNode = appendChatMessage("assistant", "Thinking...");
  try {
    const response = await requestAi(
      systemPrompt("chat", focusCourse),
      buildChatConversationMessages()
    );
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
  rememberUserText([need, work].filter(Boolean).join("\n\n"), { source: "homework", courseId: course.id });
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
  rememberUserText([extraContext, draftOrAnswers].filter(Boolean).join("\n\n"), { source: "essay", courseId: course.id });

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
  rememberUserText(draft, { source: "scorer", courseId: course.id });
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
    chat: [
      "Treat the exchange as an ongoing conversation, not isolated questions.",
      "Use recent conversation memory to keep continuity, remember the student's stated goals, and avoid making the student repeat themselves.",
      "When the user refers to earlier plans, classes, or concerns, connect back to them explicitly.",
      "When the user asks to explain a concept, use the selected course's terminology, assignments, rubric cues, and announcements instead of giving a generic textbook answer."
    ].join(" "),
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
    buildLongTermMemoryPromptBlock(mode),
    mode === "chat" ? buildChatMemoryPromptBlock(focusCourse) : "",
    "If data is missing, say so plainly. Do not invent assignment requirements, rubric criteria, or source material.",
    "Visible course data:",
    courseData
  ].filter(Boolean).join("\n\n");
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

async function fetchJson(path, options = {}) {
  const response = await fetch(apiUrl(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function authFetch(path, options = {}, token = state.sessionToken) {
  if (!token) throw new Error("Unauthorized.");
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  return fetchJson(path, { ...options, headers });
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
  localStorage.removeItem(STORAGE_KEYS.sessionToken);
  state.context = null;
  state.currentUser = "";
  state.sessionToken = "";
  state.settings = { canvasDomain: "", hasCanvasToken: false };
  state.hiddenCourses = [];
  state.completedAssignments = [];
  state.customEvents = [];
  state.chatHistory = [];
  state.userMemory = createEmptyUserMemory();
  state.essayCoach = null;
  state.calendarMonthCursor = null;
  state.dashboardTab = "planner";
  elements.loginPasswordInput.value = "";
  if (elements.settingsPasswordInput) elements.settingsPasswordInput.value = "";
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

function setDashboardTab(tabId) {
  const nextTab = tabId || "planner";
  state.dashboardTab = nextTab;
  elements.dashboardTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.dashboardTab === nextTab));
  elements.dashboardViews.forEach(view => view.classList.toggle("active", view.id === `dashboardView-${nextTab}`));
}

function courseOptionsHtml(courses, emptyLabel) {
  if (!courses.length) return `<option value="">${escapeHtml(emptyLabel)}</option>`;
  return courses.map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`).join("");
}

function visibleCourses() {
  return (state.context?.courses || []).filter(course => !state.hiddenCourses.includes(String(course.id)));
}

function visibleAssignments() {
  return visibleCourses().flatMap(course => (course.assignments || []).map(assignment => ({
    ...assignment,
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    isManuallyCompleted: isAssignmentMarkedComplete(course.id, assignment.id)
  })));
}

function selectedChatCourse() {
  return visibleCourses().find(course => String(course.id) === String(elements.chatCourseSelect.value)) || null;
}

function renderAssignmentCard(item) {
  return `
    <article class="assignment-card ${item.isManuallyCompleted ? "is-complete" : ""}">
      <div class="assignment-course">${escapeHtml(item.courseName)}</div>
      <div class="assignment-name">${escapeHtml(item.name)}</div>
      <div class="assignment-meta">
        <span class="status-chip ${urgencyClass(item)}">${escapeHtml(priorityLabel(item))}</span>
        <span class="mini-copy">${escapeHtml(formatDateTime(item.due_at))}</span>
      </div>
      <div class="mini-copy">${escapeHtml(item.description || item.actionLabel || "No assignment description available.")}</div>
      <div class="assignment-actions">
        <button class="ghost-btn assignment-toggle-btn" data-course-id="${escapeHtml(item.courseId)}" data-assignment-id="${escapeHtml(item.id)}" type="button">${item.isManuallyCompleted ? "Mark Active" : "Mark Complete"}</button>
      </div>
      <div class="assignment-links">
        <span class="mini-copy">${escapeHtml(item.actionLabel)}</span>
        ${item.html_url ? `<a href="${escapeHtml(item.html_url)}" target="_blank" rel="noreferrer">Open in Canvas</a>` : ""}
      </div>
    </article>
  `;
}

function renderCalendarAgendaCard(item) {
  if (item.itemType === "event") {
    return `
      <article class="assignment-card assignment-card-event ${item.isCompleted ? "is-complete" : ""}">
        <div class="assignment-course">Personal Task</div>
        <div class="assignment-name">${escapeHtml(item.title)}</div>
        <div class="assignment-meta">
          <span class="status-chip ${calendarItemClass(item)}">${escapeHtml(priorityLabel(item))}</span>
          <span class="mini-copy">${escapeHtml(formatDateTime(item.startsAt))}</span>
        </div>
        <div class="mini-copy">${escapeHtml(item.notes || "No additional notes.")}</div>
        <div class="assignment-actions">
          <button class="ghost-btn assignment-toggle-btn" data-event-id="${escapeHtml(item.id)}" data-action="toggle-event" type="button">${item.isCompleted ? "Mark Active" : "Mark Complete"}</button>
          <button class="ghost-btn assignment-toggle-btn danger-soft" data-event-id="${escapeHtml(item.id)}" data-action="delete-event" type="button">Delete Task</button>
        </div>
      </article>
    `;
  }
  return renderAssignmentCard(item);
}

function calendarHeatClass(count) {
  if (count >= 4) return "heat-4";
  if (count === 3) return "heat-3";
  if (count === 2) return "heat-2";
  if (count === 1) return "heat-1";
  return "heat-0";
}

function urgencyClass(item) {
  if (item.isManuallyCompleted) return "complete";
  if (item.isMissing) return "urgent";
  const days = daysUntil(item.due_at);
  if (days <= 1) return "urgent";
  if (days <= 4) return "soon";
  return "ok";
}

function priorityLabel(item) {
  if (item.itemType === "event") {
    if (item.isCompleted) return "Completed";
    const days = daysUntil(item.startsAt);
    if (days < 0) return "Past due";
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `${days} days left`;
  }
  if (item.isManuallyCompleted) return "Completed";
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
  const now = Date.now();
  const items = [
    ...actionableAssignments().map(item => ({ ...item, itemType: "assignment" })),
    ...customCalendarEvents()
      .filter(item => !item.isCompleted && new Date(item.startsAt).getTime() >= now - 86400000)
      .map(item => ({ ...item, itemType: "event" }))
  ].sort((left, right) => itemDateValue(left) - itemDateValue(right));
  return items[0] ? new Date(itemDateValue(items[0])) : new Date();
}

function currentCalendarAnchorMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function calendarBaseDate() {
  if (state.calendarMonthCursor) {
    return clampCalendarMonth(new Date(state.calendarMonthCursor));
  }
  const base = currentCalendarAnchorMonth();
  state.calendarMonthCursor = base.toISOString();
  return base;
}

function shiftCalendarMonth(offset) {
  const base = calendarBaseDate();
  const next = clampCalendarMonth(new Date(base.getFullYear(), base.getMonth() + offset, 1));
  state.calendarMonthCursor = next.toISOString();
  renderCalendar();
}

function handleCalendarMonthSelect() {
  const value = String(elements.calendarMonthSelect?.value || "");
  if (!value) return;
  const selected = new Date(value);
  if (Number.isNaN(selected.getTime())) return;
  state.calendarMonthCursor = clampCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)).toISOString();
  renderCalendar();
}

function isInCalendarMonth(value, base) {
  const date = new Date(value);
  return date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth();
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

function persistUserMemory() {
  state.userMemory = normalizeUserMemory(state.userMemory);
  localStorage.setItem(userScopedKey("userMemory"), JSON.stringify(state.userMemory));
}

function rememberUserText(text, meta = {}) {
  const cleaned = String(text || "").trim();
  if (!cleaned || cleaned.length < 8) return;

  const memory = normalizeUserMemory(state.userMemory);
  const styleTraits = inferWritingStyle(cleaned);
  const goals = extractGoalSignals(cleaned);
  const concerns = extractConcernSignals(cleaned);
  const preferences = extractPreferenceSignals(cleaned);

  memory.goals = mergeMemoryItems(memory.goals, goals);
  memory.concerns = mergeMemoryItems(memory.concerns, concerns);
  memory.preferences = mergeMemoryItems(memory.preferences, preferences);

  memory.writing.samples = [
    {
      text: truncateText(cleaned, 280),
      source: meta.source || "unknown",
      courseId: meta.courseId || null,
      capturedAt: new Date().toISOString()
    },
    ...(memory.writing.samples || [])
  ].slice(0, 6);

  memory.writing.metrics = mergeWritingMetrics(memory.writing.metrics, styleTraits.metrics);
  memory.writing.voice = styleTraits.voice;
  memory.writing.notes = styleTraits.notes;

  state.userMemory = memory;
  persistUserMemory();
}

function buildChatConversationMessages() {
  return state.chatHistory
    .slice(-CHAT_MEMORY_LIMIT)
    .map(entry => ({
      role: entry.role,
      content: formatChatEntryForModel(entry)
    }));
}

function buildChatMemoryPromptBlock(focusCourse) {
  const memoryLines = buildChatMemoryLines(focusCourse);
  if (!memoryLines.length) return "";
  return [
    "Recent conversation memory:",
    memoryLines.map(line => `- ${line}`).join("\n")
  ].join("\n");
}

function buildLongTermMemoryPromptBlock(mode) {
  const memory = normalizeUserMemory(state.userMemory);
  const lines = [];

  if (memory.goals.length) {
    lines.push(`Student goals: ${memory.goals.join(" | ")}`);
  }
  if (memory.concerns.length) {
    lines.push(`Recurring concerns: ${memory.concerns.join(" | ")}`);
  }
  if (memory.preferences.length) {
    lines.push(`Student preferences: ${memory.preferences.join(" | ")}`);
  }

  const writingSummary = buildWritingStyleSummary(memory.writing);
  if (writingSummary) {
    lines.push(`Writing style memory: ${writingSummary}`);
    if (mode === "essay_build" || mode === "scorer" || mode === "homework" || mode === "chat") {
      lines.push("When helping with writing, preserve the student's natural voice instead of overwriting it with a generic academic style.");
    }
  }

  if (!lines.length) return "";
  return [
    "Long-term student memory:",
    lines.map(line => `- ${line}`).join("\n")
  ].join("\n");
}

function buildChatMemoryLines(focusCourse) {
  const focusCourseId = String(focusCourse?.id || "");
  return state.chatHistory
    .slice(-8)
    .filter(entry => !focusCourseId || !entry.courseId || String(entry.courseId) === focusCourseId)
    .map(entry => {
      const roleLabel = entry.role === "user" ? "Student" : "Assistant";
      const courseLabel = entry.courseId ? courseNameById(entry.courseId) : "";
      const prefix = courseLabel ? `${roleLabel} (${courseLabel})` : roleLabel;
      return `${prefix}: ${truncateText(entry.content, 180)}`;
    });
}

function formatChatEntryForModel(entry) {
  const courseLabel = entry.courseId ? courseNameById(entry.courseId) : "";
  if (!courseLabel) return entry.content;
  const speaker = entry.role === "user" ? "Student" : "Assistant";
  return `[${speaker} | Course: ${courseLabel}]\n${entry.content}`;
}

function courseNameById(courseId) {
  return (state.context?.courses || []).find(course => String(course.id) === String(courseId))?.name || "Course";
}

function truncateText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}...`;
}

function createEmptyUserMemory() {
  return {
    goals: [],
    concerns: [],
    preferences: [],
    writing: {
      voice: [],
      notes: [],
      samples: [],
      metrics: {
        sampleCount: 0,
        avgSentenceLength: 0,
        avgWordLength: 0,
        firstPersonRatio: 0,
        contractionRatio: 0
      }
    }
  };
}

function normalizeUserMemory(value) {
  const base = createEmptyUserMemory();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  return {
    goals: Array.isArray(value.goals) ? value.goals.slice(0, 8).map(String) : [],
    concerns: Array.isArray(value.concerns) ? value.concerns.slice(0, 8).map(String) : [],
    preferences: Array.isArray(value.preferences) ? value.preferences.slice(0, 8).map(String) : [],
    writing: {
      voice: Array.isArray(value.writing?.voice) ? value.writing.voice.slice(0, 8).map(String) : [],
      notes: Array.isArray(value.writing?.notes) ? value.writing.notes.slice(0, 8).map(String) : [],
      samples: Array.isArray(value.writing?.samples) ? value.writing.samples.slice(0, 6) : [],
      metrics: {
        sampleCount: Number(value.writing?.metrics?.sampleCount) || 0,
        avgSentenceLength: Number(value.writing?.metrics?.avgSentenceLength) || 0,
        avgWordLength: Number(value.writing?.metrics?.avgWordLength) || 0,
        firstPersonRatio: Number(value.writing?.metrics?.firstPersonRatio) || 0,
        contractionRatio: Number(value.writing?.metrics?.contractionRatio) || 0
      }
    }
  };
}

function mergeMemoryItems(existing, additions) {
  return Array.from(new Set([...(existing || []), ...(additions || [])])).slice(0, 8);
}

function inferWritingStyle(text) {
  const words = (text.match(/\b[\w']+\b/g) || []);
  const sentences = text.split(/[.!?]+/).map(part => part.trim()).filter(Boolean);
  const sampleWordCount = words.length || 1;
  const avgSentenceLength = sampleWordCount / Math.max(sentences.length, 1);
  const avgWordLength = words.reduce((sum, word) => sum + word.replace(/'/g, "").length, 0) / sampleWordCount;
  const firstPersonCount = (text.match(/\b(I|I'm|I've|I'd|me|my|mine|we|we're|we've|our|us)\b/gi) || []).length;
  const contractionCount = (text.match(/\b\w+'\w+\b/g) || []).length;
  const bulletLike = /(^|\n)\s*[-*]/.test(text);

  const voice = [];
  const notes = [];
  if (avgSentenceLength <= 10) voice.push("leans concise and direct");
  if (avgSentenceLength > 18) voice.push("often writes in longer, connected sentences");
  if (firstPersonCount / sampleWordCount > 0.03) voice.push("uses first-person phrasing comfortably");
  if (contractionCount / sampleWordCount > 0.04) voice.push("uses contractions and a conversational tone");
  if (bulletLike) notes.push("sometimes organizes thoughts in bullet-like structure");
  if (/\b(maybe|probably|sort of|kind of)\b/i.test(text)) notes.push("sometimes softens claims");
  if (/\b(because|therefore|however|although|while)\b/i.test(text)) notes.push("often explains reasoning explicitly");
  if (!voice.length) voice.push("prefers a neutral student voice");

  return {
    voice: Array.from(new Set(voice)).slice(0, 4),
    notes: Array.from(new Set(notes)).slice(0, 4),
    metrics: {
      sampleCount: 1,
      avgSentenceLength,
      avgWordLength,
      firstPersonRatio: firstPersonCount / sampleWordCount,
      contractionRatio: contractionCount / sampleWordCount
    }
  };
}

function mergeWritingMetrics(existing, incoming) {
  const previousCount = Number(existing?.sampleCount) || 0;
  const nextCount = previousCount + (Number(incoming?.sampleCount) || 0);
  if (!nextCount) return createEmptyUserMemory().writing.metrics;

  const mergeAverage = (oldValue, newValue) => (
    ((Number(oldValue) || 0) * previousCount + (Number(newValue) || 0) * (Number(incoming?.sampleCount) || 0)) / nextCount
  );

  return {
    sampleCount: nextCount,
    avgSentenceLength: mergeAverage(existing?.avgSentenceLength, incoming?.avgSentenceLength),
    avgWordLength: mergeAverage(existing?.avgWordLength, incoming?.avgWordLength),
    firstPersonRatio: mergeAverage(existing?.firstPersonRatio, incoming?.firstPersonRatio),
    contractionRatio: mergeAverage(existing?.contractionRatio, incoming?.contractionRatio)
  };
}

function buildWritingStyleSummary(writing) {
  const memory = writing || {};
  const parts = [];
  if (Array.isArray(memory.voice) && memory.voice.length) {
    parts.push(memory.voice.join(" | "));
  }
  if (Array.isArray(memory.notes) && memory.notes.length) {
    parts.push(memory.notes.join(" | "));
  }
  const metrics = memory.metrics || {};
  if ((metrics.sampleCount || 0) > 0) {
    if ((metrics.avgSentenceLength || 0) <= 10) parts.push("average sentence length is fairly short");
    if ((metrics.avgSentenceLength || 0) > 18) parts.push("average sentence length is fairly long");
    if ((metrics.firstPersonRatio || 0) > 0.03) parts.push("first-person voice is part of the user's natural style");
    if ((metrics.contractionRatio || 0) > 0.04) parts.push("a conversational rhythm shows up consistently");
  }
  return parts.join(" | ");
}

function extractGoalSignals(text) {
  return extractMemoryMatches(text, [
    /\b(?:i need to|i want to|i'm trying to|i am trying to|my goal is to)\s+([^.!?\n]+)/gi,
    /\b(?:help me|can you help me)\s+([^.!?\n]+)/gi
  ]);
}

function extractConcernSignals(text) {
  return extractMemoryMatches(text, [
    /\b(?:i struggle with|i'm struggling with|i am struggling with|i keep messing up|i get stuck on)\s+([^.!?\n]+)/gi,
    /\b(?:this is hard because|this is difficult because)\s+([^.!?\n]+)/gi
  ]);
}

function extractPreferenceSignals(text) {
  return extractMemoryMatches(text, [
    /\b(?:i prefer|i like|i usually write|i usually prefer)\s+([^.!?\n]+)/gi,
    /\b(?:keep it|make it)\s+(simple|concise|clear|direct|detailed|formal|casual)\b/gi
  ]).map(item => item.replace(/\s+/g, " ").trim());
}

function extractMemoryMatches(text, patterns) {
  const matches = [];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const captured = truncateText(String(match[1] || "").trim(), 120);
      if (captured) matches.push(captured);
    }
  });
  return Array.from(new Set(matches)).slice(0, 4);
}

function actionableAssignments() {
  return visibleAssignments().filter(item => !isAssignmentComplete(item) || item.isMissing);
}

function customCalendarEvents() {
  return normalizeCustomItems(state.customEvents);
}

function assignmentStorageKey(courseId, assignmentId) {
  return `${courseId}:${assignmentId}`;
}

function isAssignmentMarkedComplete(courseId, assignmentId) {
  const key = assignmentStorageKey(courseId, assignmentId);
  return state.completedAssignments.includes(key);
}

function isAssignmentComplete(item) {
  return Boolean(item.isSubmitted || item.isManuallyCompleted);
}

function persistCompletedAssignments() {
  localStorage.setItem(userScopedKey("completedAssignments"), JSON.stringify(state.completedAssignments));
}

function persistCustomEvents() {
  state.customEvents = normalizeCustomItems(state.customEvents);
  localStorage.setItem(userScopedKey("customEvents"), JSON.stringify(state.customEvents));
}

function addCalendarEvent() {
  const title = String(elements.calendarEventTitle?.value || "").trim();
  const startsAt = String(elements.calendarEventDateTime?.value || "").trim();
  const notes = String(elements.calendarEventNotes?.value || "").trim();

  if (!title || !startsAt) {
    setStatus("error", "Task title and due date/time are required.");
    return;
  }

  const parsedDate = new Date(startsAt);
  if (Number.isNaN(parsedDate.getTime())) {
    setStatus("error", "Choose a valid task date and time.");
    return;
  }

  state.customEvents = [
    ...state.customEvents,
    {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      startsAt: parsedDate.toISOString(),
      notes,
      isCompleted: false
    }
  ].sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));
  persistCustomEvents();

  if (elements.calendarEventTitle) elements.calendarEventTitle.value = "";
  if (elements.calendarEventDateTime) elements.calendarEventDateTime.value = "";
  if (elements.calendarEventNotes) elements.calendarEventNotes.value = "";

  renderCalendar();
  renderPriorityList();
  renderOverview();
  setStatus("ok", `Added personal task: ${title}.`);
}

function handleAssignmentToggleClick(event) {
  const button = event.target.closest(".assignment-toggle-btn");
  if (!button) return;

  if (button.dataset.action === "toggle-event") {
    toggleCustomEvent(button.dataset.eventId);
    return;
  }

  const courseId = String(button.dataset.courseId || "");
  const assignmentId = String(button.dataset.assignmentId || "");
  if (!courseId || !assignmentId) return;

  const key = assignmentStorageKey(courseId, assignmentId);
  if (state.completedAssignments.includes(key)) {
    state.completedAssignments = state.completedAssignments.filter(value => value !== key);
  } else {
    state.completedAssignments = [...state.completedAssignments, key];
  }
  persistCompletedAssignments();
  renderDashboard();
}

function handleCalendarAgendaClick(event) {
  const deleteButton = event.target.closest('[data-action="delete-event"]');
  if (deleteButton) {
    const eventId = String(deleteButton.dataset.eventId || "");
    if (!eventId) return;
    state.customEvents = state.customEvents.filter(item => item.id !== eventId);
    persistCustomEvents();
    renderCalendar();
    renderPriorityList();
    renderOverview();
    setStatus("ok", "Task removed from your calendar.");
    return;
  }

  handleAssignmentToggleClick(event);
}

function itemDateValue(item) {
  return new Date(itemDateField(item)).getTime();
}

function itemDisplayName(item) {
  return item.itemType === "event" ? item.title : item.name;
}

function itemDisplayMeta(item) {
  if (item.itemType === "event") return "Personal Task";
  return item.courseName;
}

function calendarItemClass(item) {
  if (item.itemType === "event") {
    if (item.isCompleted) return "complete";
    const days = daysUntil(item.startsAt);
    if (days <= 1) return "urgent";
    if (days <= 4) return "soon";
    return "event";
  }
  return urgencyClass(item);
}

function renderCalendarMonthControls(base) {
  const windowMonths = calendarWindowMonths();
  if (elements.calendarMonthSelect) {
    elements.calendarMonthSelect.innerHTML = windowMonths.map(month => `
      <option value="${escapeHtml(month.toISOString())}" ${isSameMonth(month, base) ? "selected" : ""}>
        ${escapeHtml(formatCalendarMonth(month))}
      </option>
    `).join("");
  }

  const firstMonth = windowMonths[0];
  const lastMonth = windowMonths[windowMonths.length - 1];
  if (elements.calendarPrevMonthBtn) {
    elements.calendarPrevMonthBtn.disabled = isSameMonth(base, firstMonth);
  }
  if (elements.calendarNextMonthBtn) {
    elements.calendarNextMonthBtn.disabled = isSameMonth(base, lastMonth);
  }
}

function calendarWindowMonths() {
  const anchor = calendarWindowAnchor();
  const months = [];
  for (let offset = -6; offset <= 6; offset += 1) {
    months.push(new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1));
  }
  return months;
}

function calendarWindowAnchor() {
  return currentCalendarAnchorMonth();
}

function clampCalendarMonth(value) {
  const month = new Date(value.getFullYear(), value.getMonth(), 1);
  const windowMonths = calendarWindowMonths();
  const firstMonth = windowMonths[0];
  const lastMonth = windowMonths[windowMonths.length - 1];
  if (month < firstMonth) return firstMonth;
  if (month > lastMonth) return lastMonth;
  return month;
}

function isSameMonth(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function formatCalendarMonth(value) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(value);
}

function itemDateField(item) {
  return item.itemType === "event" ? item.startsAt : item.due_at;
}

function isCalendarItemComplete(item) {
  if (item.itemType === "event") return Boolean(item.isCompleted);
  return Boolean(item.isManuallyCompleted);
}

function toggleCustomEvent(eventId) {
  const id = String(eventId || "");
  if (!id) return;

  state.customEvents = normalizeCustomItems(state.customEvents).map(item => (
    item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
  ));
  persistCustomEvents();
  renderCalendar();
  renderPriorityList();
  renderOverview();

  const toggled = state.customEvents.find(item => item.id === id);
  if (toggled) {
    setStatus("ok", toggled.isCompleted ? `Completed personal task: ${toggled.title}.` : `Reopened personal task: ${toggled.title}.`);
  }
}

function normalizeCustomItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => item && item.id && item.title && item.startsAt)
    .map(item => ({
      ...item,
      notes: String(item.notes || ""),
      isCompleted: Boolean(item.isCompleted)
    }))
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));
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

function userScopedKey(suffix) {
  return `canvasDashboard:${state.currentUser || "guest"}:${suffix}`;
}

function userScopedKeyFor(username, suffix) {
  return `canvasDashboard:${username || "guest"}:${suffix}`;
}

function migrateUserScopedStorage(fromUsername, toUsername) {
  if (!fromUsername || !toUsername || fromUsername === toUsername) return;
  USER_SCOPED_SUFFIXES.forEach(suffix => {
    const fromKey = userScopedKeyFor(fromUsername, suffix);
    const toKey = userScopedKeyFor(toUsername, suffix);
    const value = localStorage.getItem(fromKey);
    if (value !== null) {
      localStorage.setItem(toKey, value);
      localStorage.removeItem(fromKey);
    }
  });
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDomain(value) {
  return String(value || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }









