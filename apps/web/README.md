# Epideixi Web

React SPA (Vite + TypeScript + React Router) for the Epideixi demo.

## Setup

From the repository root:

```bash
npm install
cp apps/web/.env.example apps/web/.env
```

Set `VITE_API_BASE_URL` to the API base URL (local: `http://localhost:5080`, deployed: SAM output **ApiBaseUrl**).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

Run from the repo root via workspaces, or `npm run dev` inside `apps/web`.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — shows configured API URL |
| `/protected` | Placeholder for future Cognito integration |
| `/error` | Error page; unknown paths → 404 |

See the [root README](../../README.md) and [API README](../api/README.md) for Cognito, PostgreSQL, and SAM deployment.
