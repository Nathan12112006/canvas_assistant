# Canvas Assistant

Canvas Assistant is a student website built around live Canvas coursework. It brings your classes, assignments, due dates, and AI study tools into one place so you can see what matters first without digging through each course manually.

The site is designed to help students:
- track upcoming and overdue assignments
- view coursework in a calendar and priority queue
- use AI chat grounded in real class context
- generate study notes and homework help
- get essay support and draft scoring based on assignment details

## Live website

[https://canvas-assistant-api.onrender.com](https://canvas-assistant-api.onrender.com)

## What the website does

Canvas Assistant connects to your Canvas account using your Canvas domain and access token. Once connected, it builds a dashboard around your real course data so the experience stays relevant to your actual workload.

Main features:
- account signup and login
- Canvas-connected dashboard
- assignment calendar and urgency tracking
- priority queue for important work
- course-aware AI chat
- study notes generation
- homework help
- essay coaching
- draft scoring

## How it works

After signing up, the website checks your Canvas connection, saves your account details, and loads your dashboard. From there, you can review assignments, filter visible courses, and use the built-in AI tools without leaving the site.

## Notes

- Node 18+ is required for local development.
- `.env` should stay private and should not be committed.
- Canvas access tokens are stored in browser `localStorage` for convenience.
- Deployment details are in [DEPLOYMENT.md](DEPLOYMENT.md).
