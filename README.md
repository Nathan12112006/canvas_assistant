# Canvas Assistant

Canvas Assistant is a student website built around live Canvas coursework. It brings your classes, assignments, due dates, personal tasks, and AI study tools into one place so you can see what matters first without digging through each course manually.

The site is designed to help students:
- track upcoming and overdue assignments
- view coursework in a calendar and priority queue
- add personal tasks and mark work complete
- use AI chat grounded in real class context
- generate study notes and homework help
- get essay support and draft scoring based on assignment details
- keep ongoing AI conversations and long-term memory across sessions

## Live website

[https://canvas-assistant-api.onrender.com](https://canvas-assistant-api.onrender.com)

## What the website does

Canvas Assistant connects to your Canvas account using your Canvas domain and access token. Once connected, it builds a dashboard around your real course data so the experience stays relevant to your actual workload.

Main features:
- account signup and login
- editable account settings for username, password, Canvas domain, and Canvas token
- Canvas-connected dashboard split into `Planner`, `AI Studio`, and `Settings`
- assignment calendar with a bounded month selector window
- personal task creation and completion tracking on the calendar
- priority queue for important work
- visible course controls on a dedicated settings page
- course-aware AI chat with conversational memory
- persistent long-term AI memory for goals, preferences, recurring concerns, and writing style
- study notes generation
- homework help
- essay coaching
- draft scoring

## How it works

After signing up, the website checks your Canvas connection, saves your account details, and loads your dashboard.

From there:
- `Planner` shows your overview, priority queue, calendar, Canvas assignments, and personal tasks.
- `AI Studio` contains AI chat, study notes, homework help, essay help, and draft scoring.
- `Settings` contains visible course controls plus editable login and Canvas connection details.

The AI layer uses both short-term conversation history and longer-term saved memory. That means it can continue a conversation naturally, remember stated goals and struggles, and preserve the user's writing style when helping with essays and other writing-heavy tasks.

## Current behavior

- Users can mark Canvas assignments complete from the priority queue and calendar agenda.
- Users can add their own personal tasks, which appear on the calendar and can also be marked complete later.
- The calendar supports month navigation within a limited window around the current planning range instead of open-ended month scrolling.
- Username changes migrate account-scoped dashboard data, including hidden courses, completed items, custom tasks, chat history, and saved AI memory.
- AI writing support tries to preserve the user's natural tone instead of rewriting everything into a generic voice.

## Notes

- Node 18+ is required for local development.
- `.env` should stay private and should not be committed.
- Account data, Canvas credentials, dashboard state, and AI memory are stored in browser `localStorage`.
- Deployment details are in [DEPLOYMENT.md](DEPLOYMENT.md).
