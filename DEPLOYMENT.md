# Deployment Guide

This repo is set up to deploy with:
- Frontend on Vercel as a static site from `public/`
- Backend on Render as a Node web service from `proxy-server.js`

## Files added for deployment

- `vercel.json`: tells Vercel to serve the static frontend from `public/`
- `render.yaml`: tells Render how to run the backend web service
- `public/runtime-config.js`: frontend runtime API target
- `.env.example`: local env template
- `.gitignore`: keeps secrets and local artifacts out of git

## Architecture

- Vercel serves the UI at `/` and `/auth`
- The frontend reads `window.CANVAS_ASSISTANT_CONFIG.apiBaseUrl` from `public/runtime-config.js`
- If `apiBaseUrl` is blank, the app calls same-origin `/api/...`
- If `apiBaseUrl` is set, the app calls the Render backend directly
- The Render backend now supports CORS through `ALLOWED_ORIGINS`

## Step-by-step deployment

### 1. Push the repo to GitHub

Make sure these files are committed:
- `public/runtime-config.js`
- `vercel.json`
- `render.yaml`
- `.env.example`
- your existing app files

Do not commit the real `.env` file.

### 2. Deploy the backend to Render first

1. Sign in to Render.
2. Create a new Web Service from this GitHub repo.
3. Render should detect `render.yaml`. If it asks, use these values:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Set these environment variables in Render:
   - `OPENAI_API_KEY`: your real OpenAI API key
   - `OPENAI_MODEL`: `gpt-4.1-mini`
   - `ALLOWED_ORIGINS`: your future Vercel frontend URL, for example `https://your-app.vercel.app`
5. Deploy the service.
6. After it finishes, open `https://YOUR-RENDER-SERVICE.onrender.com/health` and confirm you get a JSON response with `ok: true`.

### 3. Point the frontend at the Render backend

Open `public/runtime-config.js` and set the deployed Render backend URL:

```js
window.CANVAS_ASSISTANT_CONFIG = {
  apiBaseUrl: "https://YOUR-RENDER-SERVICE.onrender.com"
};
```

Commit that change and push it.

### 4. Deploy the frontend to Vercel

1. Sign in to Vercel.
2. Import the same GitHub repo.
3. When Vercel asks for project settings, keep the root directory as the repo root.
4. `vercel.json` already tells Vercel to serve the frontend from `public`.
5. Deploy.
6. After deployment, open the Vercel URL.
7. Go to `/auth` or click Login and verify the dashboard loads.

### 5. Update Render CORS if the final Vercel URL changed

If Vercel gives you a different production URL than you expected, update Render:
- Set `ALLOWED_ORIGINS` to the exact Vercel origin, for example `https://canvas-assistant-example.vercel.app`
- Save the Render env var and let it redeploy

### 6. Final production checks

Run these checks after both deployments are live:
- Homepage loads on Vercel
- `/auth` loads on Vercel
- Login or signup screen appears without console errors
- Canvas sync works from the Vercel frontend
- AI chat works from the Vercel frontend
- `https://YOUR-RENDER-SERVICE.onrender.com/health` returns `ok: true`

## Local development

For local development, keep `public/runtime-config.js` blank so the frontend calls the local Node server:

```js
window.CANVAS_ASSISTANT_CONFIG = {
  apiBaseUrl: ""
};
```

Then use a local `.env` file with:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=http://localhost:8787
```

Start locally with:

```powershell
npm start
```

Open:
- `http://localhost:8787`
- `http://localhost:8787/auth.html`
