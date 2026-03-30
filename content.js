// content.js - injects the Canvas AI Assistant sidebar

(function () {
  if (document.getElementById("caa-root")) return;

  const root = document.createElement("div");
  root.id = "caa-root";
  root.innerHTML = `
    <div id="caa-toggle" title="Canvas AI Assistant">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
        <path d="M12 2a10 10 0 0 1 10 10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div id="caa-panel" class="caa-closed">
      <div id="caa-header">
        <div id="caa-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Canvas AI</span>
        </div>
        <div id="caa-header-actions">
          <button id="caa-refresh" title="Refresh course data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button id="caa-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div id="caa-tabs">
        <button class="caa-tab active" data-tab="chat">Chat</button>
        <button class="caa-tab" data-tab="notes">Study Notes</button>
        <button class="caa-tab" data-tab="homework">Homework Help</button>
        <button class="caa-tab" data-tab="upcoming">Upcoming</button>
      </div>

      <div id="caa-status-bar"></div>

      <div class="caa-pane active" id="caa-pane-chat">
        <div class="caa-messages" id="caa-chat-messages">
          <div class="caa-msg assistant">
            <div class="caa-msg-bubble">Hi! I'm your Canvas AI assistant. I can read your course announcements, assignments, and submission status to help you stay on top of your work.</div>
          </div>
        </div>
        <div class="caa-input-row">
          <textarea id="caa-chat-input" placeholder="Ask anything about your courses..." rows="1"></textarea>
          <button class="caa-send-btn" id="caa-chat-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      <div class="caa-pane" id="caa-pane-notes">
        <div class="caa-pane-inner">
          <p class="caa-hint">Generate comprehensive study notes for any of your visible courses, drawing on announcements and assignment details.</p>
          <label class="caa-label">Select course</label>
          <select id="caa-notes-course" class="caa-select"></select>
          <label class="caa-label">Focus area (optional)</label>
          <input id="caa-notes-focus" class="caa-input" type="text" placeholder="e.g. Week 4 lecture topics, midterm prep..."/>
          <button class="caa-action-btn" id="caa-notes-generate">Generate Study Notes</button>
          <div class="caa-output" id="caa-notes-output"></div>
        </div>
      </div>

      <div class="caa-pane" id="caa-pane-homework">
        <div class="caa-pane-inner">
          <p class="caa-hint">Get help with any unfinished assignment, including math, problem sets, coding work, essays, labs, quizzes, and discussion posts.</p>
          <label class="caa-label">Select class</label>
          <select id="caa-homework-course" class="caa-select"></select>
          <label class="caa-label">Select assignment</label>
          <select id="caa-homework-assignment" class="caa-select"></select>
          <label class="caa-label">What do you need help with?</label>
          <textarea id="caa-homework-input" class="caa-textarea" placeholder="e.g. Solve question 3, explain the math steps, help me debug my code, outline my response..." rows="3"></textarea>
          <label class="caa-label">Paste your work (optional)</label>
          <textarea id="caa-homework-work" class="caa-textarea" placeholder="Paste the question, your attempt, equations, code, or draft here..." rows="5"></textarea>
          <button class="caa-action-btn" id="caa-homework-generate">Get Homework Help</button>
          <div class="caa-output" id="caa-homework-output"></div>
        </div>
      </div>

      <div class="caa-pane" id="caa-pane-upcoming">
        <div class="caa-pane-inner" id="caa-upcoming-list">
          <div class="caa-loading-msg">Loading your assignments...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  let canvasContext = null;
  let chatHistory = [];
  let isOpen = false;
  let ignoredCourseIds = [];

  const toggle = document.getElementById("caa-toggle");
  const panel = document.getElementById("caa-panel");

  toggle.addEventListener("click", () => {
    isOpen = !isOpen;
    panel.classList.toggle("caa-closed", !isOpen);
    toggle.classList.toggle("active", isOpen);
    if (isOpen && !canvasContext) loadContext();
  });

  document.getElementById("caa-close").addEventListener("click", () => {
    isOpen = false;
    panel.classList.add("caa-closed");
    toggle.classList.remove("active");
  });

  document.querySelectorAll(".caa-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".caa-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".caa-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`caa-pane-${tab.dataset.tab}`).classList.add("active");
    });
  });

  async function loadContext(force = false) {
    try {
      ensureExtensionContext();
      setStatus("loading", "Fetching your Canvas courses...");

      if (force) {
        await runtimeSendMessage({ type: "CLEAR_CACHE" });
      }

      const settings = await getSettings();
      if (!settings.canvasToken || !settings.canvasDomain || !settings.proxyUrl) {
        setStatus("error", "Setup required - click the extension icon to add your Canvas token and proxy URL.");
        return;
      }

      const res = await runtimeSendMessage({
        type: "FETCH_CANVAS_CONTEXT",
        canvasToken: settings.canvasToken,
        canvasDomain: settings.canvasDomain
      });

      if (!res?.success) {
        setStatus("error", `Canvas error: ${res?.error || "Unknown error"}`);
        return;
      }

      canvasContext = res.context;
      ignoredCourseIds = await getIgnoredCourseIds();
      canvasContext._proxyUrl = settings.proxyUrl;
      setStatus("ok", `${canvasContext.courses.length} courses loaded · ${new Date().toLocaleTimeString()}`);
      populateSelects();
      renderUpcoming();
    } catch (error) {
      handleExtensionError(error);
    }
  }

  document.getElementById("caa-refresh").addEventListener("click", () => loadContext(true));

  function populateSelects() {
    if (!canvasContext) return;

    const visibleCourses = getVisibleCourses();
    const notesCourseSelect = document.getElementById("caa-notes-course");
    const homeworkCourseSelect = document.getElementById("caa-homework-course");
    const visibleAssignments = getVisibleAssignments();

    notesCourseSelect.innerHTML = visibleCourses.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("") || `<option value="">No visible courses</option>`;

    const homeworkCourses = visibleCourses.filter(course =>
      course.assignments.some(assignment => !assignment.isSubmitted)
    );

    homeworkCourseSelect.innerHTML = homeworkCourses.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("") || `<option value="">No classes with unfinished assignments</option>`;

    populateHomeworkAssignments();

    const notesButton = document.getElementById("caa-notes-generate");
    const homeworkButton = document.getElementById("caa-homework-generate");
    notesButton.disabled = !visibleCourses.length;
    homeworkButton.disabled = !visibleAssignments.some(a => !a.isSubmitted);
  }

  function populateHomeworkAssignments() {
    const assignmentSelect = document.getElementById("caa-homework-assignment");
    const courseSelect = document.getElementById("caa-homework-course");
    const courseId = courseSelect.value;
    const course = getVisibleCourses().find(c => String(c.id) === String(courseId));
    const availableAssignments = (course?.assignments || [])
      .filter(assignment => !assignment.isSubmitted)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    assignmentSelect.innerHTML = availableAssignments.map(assignment =>
      `<option value="${assignment.id}">${escapeHtml(assignment.name)}</option>`
    ).join("") || `<option value="">No unfinished assignments in this class</option>`;
  }

  document.getElementById("caa-homework-course").addEventListener("change", populateHomeworkAssignments);

  function renderUpcoming() {
    if (!canvasContext) return;

    const list = document.getElementById("caa-upcoming-list");
    const visibleCourses = getVisibleCourses();
    const hiddenCount = canvasContext.courses.length - visibleCourses.length;
    const allAssignments = visibleCourses.flatMap(course =>
      course.assignments.map(assignment => ({
        ...assignment,
        courseName: course.name,
        courseId: String(course.id)
      }))
    ).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    const filterPanel = renderCourseFilters(hiddenCount);

    if (!allAssignments.length) {
      list.innerHTML = filterPanel + `<div class="caa-empty">No assignments match your current course filter.</div>`;
      attachCourseFilterHandlers();
      return;
    }

    const overdue = allAssignments.filter(a => a.isMissing);
    const needsAction = allAssignments.filter(a => !a.isMissing && !a.isSubmitted);
    const submitted = allAssignments.filter(a => a.isSubmitted && !a.isMissing);

    const summary = `
      <div class="caa-upcoming-summary">
        <div class="caa-summary-pill urgent">${overdue.length} overdue</div>
        <div class="caa-summary-pill soon">${needsAction.length} to do</div>
        <div class="caa-summary-pill ok">${submitted.length} submitted</div>
      </div>
    `;

    list.innerHTML = filterPanel + summary
      + renderAssignmentSection("Missing or overdue", overdue, "Everything in this section still needs attention.")
      + renderAssignmentSection("Needs submission", needsAction, "These assignments are coming up and are not marked submitted yet.")
      + renderAssignmentSection("Submitted", submitted, "Canvas shows these assignments as already submitted or excused.");
    attachCourseFilterHandlers();
  }

  function renderCourseFilters(hiddenCount) {
    const courseOptions = canvasContext.courses.map(course => {
      const checked = ignoredCourseIds.includes(String(course.id)) ? "" : "checked";
      return `
        <label class="caa-course-filter-option">
          <input type="checkbox" class="caa-course-filter-checkbox" value="${String(course.id)}" ${checked}/>
          <span>${escapeHtml(course.name)}</span>
        </label>
      `;
    }).join("");

    return `
      <section class="caa-course-filter-panel">
        <div class="caa-section-heading">Course filter</div>
        <div class="caa-section-hint">${hiddenCount ? `${hiddenCount} course${hiddenCount === 1 ? "" : "s"} hidden across Upcoming and Homework Help.` : "Choose which courses appear in Upcoming and Homework Help."}</div>
        <div class="caa-course-filter-list">
          ${courseOptions}
        </div>
      </section>
    `;
  }

  function attachCourseFilterHandlers() {
    document.querySelectorAll(".caa-course-filter-checkbox").forEach(input => {
      input.addEventListener("change", onCourseFilterChange);
    });
  }

  async function onCourseFilterChange() {
    try {
      ensureExtensionContext();
      ignoredCourseIds = Array.from(document.querySelectorAll(".caa-course-filter-checkbox"))
        .filter(input => !input.checked)
        .map(input => input.value);
      await storageSet({ ignoredCourseIds });
      populateSelects();
      renderUpcoming();
    } catch (error) {
      handleExtensionError(error);
    }
  }

  function renderAssignmentSection(title, assignments, hint) {
    if (!assignments.length) {
      return `
        <section class="caa-upcoming-section">
          <div class="caa-section-heading">${title}</div>
          <div class="caa-section-hint">${hint}</div>
          <div class="caa-empty">${title === "Submitted" ? "Nothing submitted yet." : "Nothing here right now."}</div>
        </section>
      `;
    }

    return `
      <section class="caa-upcoming-section">
        <div class="caa-section-heading">${title}</div>
        <div class="caa-section-hint">${hint}</div>
        ${assignments.map(renderAssignmentCard).join("")}
      </section>
    `;
  }

  function renderAssignmentCard(assignment) {
    const due = new Date(assignment.due_at);
    const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
    const urgency = assignment.isMissing ? "urgent" : daysLeft <= 1 ? "urgent" : daysLeft <= 3 ? "soon" : "ok";
    const dueLabel = assignment.isMissing
      ? `Overdue by ${Math.max(1, Math.abs(daysLeft))} day${Math.abs(daysLeft) === 1 ? "" : "s"}`
      : daysLeft <= 0
        ? "Due today"
        : daysLeft === 1
          ? "Due tomorrow"
          : `${daysLeft} days left`;
    const dueStr = due.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    let statusText = "Not submitted yet";
    if (assignment.isExcused) {
      statusText = "Excused";
    } else if (assignment.submittedAt) {
      statusText = `Submitted ${formatRelativeTime(assignment.submittedAt)}`;
    } else if (assignment.isSubmitted) {
      statusText = "Marked submitted in Canvas";
    }

    return `
      <div class="caa-assignment-card ${urgency}">
        <div class="caa-assignment-course">${escapeHtml(assignment.courseName)}</div>
        <div class="caa-assignment-name">${escapeHtml(assignment.name)}</div>
        <div class="caa-assignment-meta">
          <span class="caa-due-badge ${urgency}">${dueLabel}</span>
          <span class="caa-due-date">${dueStr}</span>
        </div>
        <div class="caa-assignment-status-row">
          <span class="caa-status-chip ${assignment.isSubmitted && !assignment.isMissing ? "submitted" : assignment.isMissing ? "missing" : "pending"}">${escapeHtml(statusText)}</span>
          ${assignment.points ? `<span class="caa-points">${assignment.points} pts</span>` : ""}
        </div>
        <div class="caa-assignment-task"><strong>What to do:</strong> ${escapeHtml(assignment.actionLabel)}</div>
        ${assignment.description ? `<div class="caa-assignment-desc">${escapeHtml(assignment.description.slice(0, 220))}</div>` : ""}
      </div>
    `;
  }

  function buildSystemPrompt(mode = "chat") {
    if (!canvasContext) return "You are a helpful academic assistant.";

    const visibleCourses = getVisibleCourses();
    const coursesSummary = visibleCourses.map(course => {
      const assignments = course.assignments.slice(0, 12).map(assignment => {
        const due = new Date(assignment.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const status = assignment.isMissing
          ? "missing"
          : assignment.isSubmitted
            ? assignment.submittedAt ? `submitted on ${new Date(assignment.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "submitted"
            : "not submitted";
        return `  - ${assignment.name} (due ${due}${assignment.points ? `, ${assignment.points}pts` : ""}, ${status})
    Action: ${assignment.actionLabel}${assignment.description ? `\n    Prompt: ${assignment.description.slice(0, 200)}` : ""}`;
      }).join("\n");

      const announcements = course.announcements.slice(0, 5).map(announcement => {
        const date = new Date(announcement.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `  [${date}] ${announcement.title}: ${announcement.message.slice(0, 400)}`;
      }).join("\n");

      return `### ${course.name} (${course.code})
Assignments:
${assignments || "  None"}
Recent announcements:
${announcements || "  None"}`;
    }).join("\n\n");

    const modeInstructions = {
      chat: "Answer questions about the student's courses, help clarify assignments, and call out missing or not-yet-submitted work when relevant.",
      notes: "Generate thorough, well-structured study notes. Use announcements, assignment details, and upcoming workload to emphasize what matters most.",
      homework: "Help the student with any kind of unfinished assignment, including math, quantitative work, coding, essays, labs, and discussion posts. Show steps clearly when solving or explaining math.",
    };

    return `You are an AI academic assistant with full access to this student's visible Canvas LMS course data. Use this context to give highly specific, relevant help.

TODAY: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

${modeInstructions[mode] || modeInstructions.chat}

--- COURSE DATA ---
${coursesSummary}
--- END COURSE DATA ---

Always be specific. Reference assignment names, due dates, submission status, and professor announcements directly.`;
  }

  const chatInput = document.getElementById("caa-chat-input");
  const chatMessages = document.getElementById("caa-chat-messages");

  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
  });

  document.getElementById("caa-chat-send").addEventListener("click", sendChat);

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text || !canvasContext) return;

    try {
      ensureExtensionContext();
      chatInput.value = "";
      chatInput.style.height = "auto";

      appendMessage("user", text);
      chatHistory.push({ role: "user", content: text });

      const thinkingEl = appendMessage("assistant", "...", true);
      const settings = await getSettings();
      const res = await runtimeSendMessage({
        type: "CALL_AI",
        proxyUrl: settings.proxyUrl,
        systemPrompt: buildSystemPrompt("chat"),
        messages: chatHistory.slice(-10)
      });

      thinkingEl.remove();
      if (res?.success) {
        appendMessage("assistant", res.reply);
        chatHistory.push({ role: "assistant", content: res.reply });
      } else {
        appendMessage("assistant", `Error: ${res?.error || "Unknown error"}`);
      }
    } catch (error) {
      handleExtensionError(error);
    }
  }

  function appendMessage(role, text, isThinking = false) {
    const el = document.createElement("div");
    el.className = `caa-msg ${role}${isThinking ? " thinking" : ""}`;
    el.innerHTML = `<div class="caa-msg-bubble">${isThinking ? '<span class="caa-dots"><span></span><span></span><span></span></span>' : escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
  }

  document.getElementById("caa-notes-generate").addEventListener("click", async () => {
    if (!canvasContext) {
      alert("Still loading your courses...");
      return;
    }

    try {
      ensureExtensionContext();
      const courseId = document.getElementById("caa-notes-course").value;
      const focus = document.getElementById("caa-notes-focus").value.trim();
      const course = getVisibleCourses().find(c => String(c.id) === String(courseId));
      if (!course) return;

      const output = document.getElementById("caa-notes-output");
      output.innerHTML = `<div class="caa-generating">Generating study notes for ${escapeHtml(course.name)}...</div>`;

      const settings = await getSettings();
      const prompt = `Generate comprehensive study notes for the course "${course.name}".${focus ? ` Focus specifically on: ${focus}.` : ""}
Include:
- Key topics and concepts from the assignments
- Points emphasized in professor announcements
- Important dates and what they mean
- What still has not been submitted, if anything

Format with clear headings (##), bullet points, and highlight anything the professor specifically mentioned.`;

      const res = await runtimeSendMessage({
        type: "CALL_AI",
        proxyUrl: settings.proxyUrl,
        systemPrompt: buildSystemPrompt("notes"),
        messages: [{ role: "user", content: prompt }]
      });

      if (res?.success) {
        output.innerHTML = `<div class="caa-result">${formatMarkdown(res.reply)}</div>
          <button class="caa-copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(res.reply)})">Copy Notes</button>`;
      } else {
        output.innerHTML = `<div class="caa-error">Error: ${escapeHtml(res?.error || "Unknown error")}</div>`;
      }
    } catch (error) {
      handleExtensionError(error);
    }
  });

  document.getElementById("caa-homework-generate").addEventListener("click", async () => {
    if (!canvasContext) {
      alert("Still loading your courses...");
      return;
    }

    try {
      ensureExtensionContext();
      const courseId = document.getElementById("caa-homework-course").value;
      const assignmentId = document.getElementById("caa-homework-assignment").value;
      const need = document.getElementById("caa-homework-input").value.trim();
      const work = document.getElementById("caa-homework-work").value.trim();
      if (!need) {
        alert("Please describe what help you need.");
        return;
      }

      const course = getVisibleCourses().find(c => String(c.id) === String(courseId));
      const assignment = course?.assignments.find(a => String(a.id) === String(assignmentId) && !a.isSubmitted);
      if (!course || !assignment) {
        alert("Select a visible class and an unfinished assignment.");
        return;
      }

      const output = document.getElementById("caa-homework-output");
      output.innerHTML = `<div class="caa-generating">Working on your homework help...</div>`;

      const settings = await getSettings();
      const prompt = `Course: "${course.name}"
Assignment: "${assignment.name}"
Description / prompt: ${assignment.description || "Not provided"}
Expected action: ${assignment.actionLabel}
Due date: ${new Date(assignment.due_at).toLocaleString()}
Points: ${assignment.points || "N/A"}

Student needs: ${need}
${work ? `\nStudent work / problem statement:\n---\n${work}\n---` : ""}

Help with this assignment clearly and accurately. If it is math or quantitative work, show the steps and explain the reasoning. If the student shared an attempt, build on it instead of restarting unnecessarily.`;

      const res = await runtimeSendMessage({
        type: "CALL_AI",
        proxyUrl: settings.proxyUrl,
        systemPrompt: buildSystemPrompt("homework"),
        messages: [{ role: "user", content: prompt }]
      });

      if (res?.success) {
        output.innerHTML = `<div class="caa-result">${formatMarkdown(res.reply)}</div>
          <button class="caa-copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(res.reply)})">Copy</button>`;
      } else {
        output.innerHTML = `<div class="caa-error">Error: ${escapeHtml(res?.error || "Unknown error")}</div>`;
      }
    } catch (error) {
      handleExtensionError(error);
    }
  });

  function setStatus(type, msg) {
    const bar = document.getElementById("caa-status-bar");
    bar.className = `caa-status-bar ${type}`;
    bar.textContent = msg;
  }

  async function getSettings() {
    return storageGet(["canvasToken", "canvasDomain", "proxyUrl"]);
  }

  async function getIgnoredCourseIds() {
    const data = await storageGet(["ignoredCourseIds"]);
    return Array.isArray(data.ignoredCourseIds) ? data.ignoredCourseIds.map(String) : [];
  }

  function getVisibleCourses() {
    return (canvasContext?.courses || []).filter(course => !ignoredCourseIds.includes(String(course.id)));
  }

  function getVisibleAssignments() {
    return getVisibleCourses().flatMap(course =>
      course.assignments.map(assignment => ({
        ...assignment,
        courseId: String(course.id),
        courseName: course.name
      }))
    );
  }

  function ensureExtensionContext() {
    if (!chrome?.runtime?.sendMessage || !chrome?.storage?.local) {
      throw new Error("Extension context unavailable. Reload this Canvas tab.");
    }
  }

  function runtimeSendMessage(message) {
    ensureExtensionContext();
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function storageGet(keys) {
    ensureExtensionContext();
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, data => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(data);
      });
    });
  }

  function storageSet(data) {
    ensureExtensionContext();
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function handleExtensionError(error) {
    console.error(error);
    setStatus("error", "Extension context lost. Reload this Canvas tab.");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatMarkdown(text) {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");
  }

  function formatRelativeTime(value) {
    const submitted = new Date(value);
    if (Number.isNaN(submitted.getTime())) return "recently";

    const diff = Date.now() - submitted.getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return submitted.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
})();
