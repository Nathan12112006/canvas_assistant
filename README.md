# Canvas Assistant Dashboard

Canvas Assistant is a Canvas-connected student dashboard with a static frontend, a small Node backend, and AI-assisted study tools grounded in live course data.

## Stack

- Frontend: static HTML, CSS, and vanilla JavaScript in `public/`
- Backend: Node HTTP server in `proxy-server.js`
- AI proxy: OpenAI API through `POST /api/chat`
- Canvas sync: Canvas API through `POST /api/canvas/context`

## Local setup

1. Copy `.env.example` to `.env`.
2. Set your real OpenAI key in `.env`.
3. Start the app:

```powershell
npm start
```

4. Open [http://localhost:8787](http://localhost:8787).

## Environment variables

Use `.env.example` as the template:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=http://localhost:8787
```

## Project structure

- `public/index.html`: homepage
- `public/auth.html`: auth page and dashboard shell
- `public/app.js`: frontend dashboard logic
- `public/styles.css`: shared dashboard styling
- `public/home.css`: homepage styling
- `public/auth.css`: auth page styling
- `proxy-server.js`: backend server and API proxy
- `DEPLOYMENT.md`: Vercel and Render deployment guide
- `render.yaml`: Render service configuration
- `vercel.json`: Vercel frontend configuration

## Main routes

- `GET /`
- `GET /health`
- `POST /api/canvas/context`
- `POST /api/chat`

## Notes

- Node 18+ is required because the server uses built-in `fetch`.
- Keep `.env` private and do not commit it.
- Canvas access tokens are stored in browser `localStorage` for convenience.
- Review [DEPLOYMENT.md](DEPLOYMENT.md) before deploying.
