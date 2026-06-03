# Epideixi

Monorepo demo solution that includes React, IAM, AWS Cognito, ASP.NET Core, and PostgreSQL.

## Repository layout

| Path | Description |
|------|-------------|
| `apps/web` | React SPA (Vite + TypeScript + React Router) |
| `apps/api` | ASP.NET Core Web API (Cognito JWT, Swagger, Lambda-ready) |
| `template.yaml` | AWS SAM template (API Lambda, HTTP API, Cognito User Pool) |

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0) or newer (API targets `net6.0`; .NET 8 SDK also works)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) (deploy API to Lambda)
- npm 10+ (bundled with Node.js)

## Frontend (`apps/web`)

### Setup

```bash
npm install
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and set `VITE_API_BASE_URL` to your API base URL (local: `http://localhost:5080`, deployed: SAM output **ApiBaseUrl**).

### Start the frontend

From the repository root:

```bash
npm run dev
```

Default: http://localhost:5173

### Other frontend commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build of the web app |
| `npm run lint` | ESLint across the web app |
| `npm run preview` | Serve the production build locally |

## Backend API (`apps/api`)

See **[apps/api/README.md](apps/api/README.md)** for Cognito configuration, local run, SAM deploy, and testing protected endpoints.

Quick start (after Cognito settings are configured):

```bash
cd apps/api
dotnet run
```

- Health: http://localhost:5080/health  
- Swagger: http://localhost:5080/swagger  

Deploy with SAM from the repo root (artifacts go to `jtj-epideixi-sam-artifacts`; see `samconfig.toml`):

```bash
sam build
sam deploy
```

## Environment variables (web)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for backend APIs (no trailing slash) |

## CI

GitHub Actions runs web lint/build and API `dotnet build` on push and pull requests.
