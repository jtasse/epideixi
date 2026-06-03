# Epideixi

Monorepo for learning how to organize and build a modern frontend that integrates with AWS-hosted backend services.

## Repository layout

| Path | Description |
|------|-------------|
| `apps/web` | React SPA (Vite + TypeScript + React Router) |

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm 10+ (bundled with Node.js)

## Setup

1. Clone the repository and install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Configure API environment variables for the web app:

   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

   Edit `apps/web/.env` and set `VITE_API_BASE_URL` to your backend base URL (API Gateway, ALB, local mock, etc.).

## Start the frontend (single command)

From the repository root:

```bash
npm run dev
```

This starts the Vite dev server for `apps/web` (default: http://localhost:5173).

## Other commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build of the web app |
| `npm run lint` | ESLint across the web app |
| `npm run preview` | Serve the production build locally |

## Pages

- **Home** (`/`) — landing page; displays configured API base URL
- **Protected** (`/protected`) — placeholder route guarded for future auth
- **Error** (`/error`, unknown routes) — error and 404 handling

## Environment variables

The web app reads configuration from Vite env files (see [Vite env docs](https://vite.dev/guide/env-and-mode.html)). Variables must be prefixed with `VITE_`.

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for AWS-hosted backend APIs |

## CI

GitHub Actions runs `lint` and `build` on push and pull requests. The workflow copies `apps/web/.env.example` to `apps/web/.env` so builds do not require manual env setup in CI.
