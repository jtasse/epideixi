# Epideixi

Monorepo demo that includes React, ASP.NET Core API (via Lambda), IAM with Amazon Cognito, PostgreSQL (Entity Framework Core), and AWS SAM.

## Repository layout

| Path | Description |
|------|-------------|
| [apps/web](apps/web) | React SPA (Vite + TypeScript + React Router); see [apps/web/README.md](apps/web/README.md) |
| [apps/api](apps/api) | ASP.NET Core Web API — Cognito JWT, EF Core, PostgreSQL |
| [apps/api/README.md](apps/api/README.md) | API configuration, migrations, endpoints, SAM/RDS details |
| [docker-compose.yml](docker-compose.yml) | Local PostgreSQL 16 (persistent volume) |
| [template.yaml](template.yaml) | SAM: Lambda, HTTP API, Cognito; optional RDS + VPC |
| [samconfig.toml.example](samconfig.toml.example) | Example SAM deploy config (copy to `samconfig.toml`) |
| [scripts/db](scripts/db) | SQL scripts for RDS IAM database user setup |
| [.config/dotnet-tools.json](.config/dotnet-tools.json) | Pin `dotnet-ef` for migrations |

## Prerequisites

| Tool | Used for |
|------|----------|
| [Node.js](https://nodejs.org/) 20+ | React app |
| [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0)+ | API (`net6.0`) |
| [Docker](https://www.docker.com/) | Local PostgreSQL |
| [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) | Build and deploy API to Lambda |
| [AWS CLI](https://aws.amazon.com/cli/) | Deploy, Parameter Store, optional RDS admin |
| npm 10+ | Frontend workspaces |

AWS credentials are required for `sam deploy`, for reading deployment secrets (see [docs/deployment.md](docs/deployment.md)), and when provisioning RDS.

## Quick start (local full stack)

1. **PostgreSQL**

   ```bash
   docker compose up -d
   ```

2. **API** — configure Cognito in `apps/api/appsettings.Development.json` (or user secrets), then:

   ```bash
   dotnet tool restore
   cd apps/api
   dotnet run
   ```

   - Health: http://localhost:5080/health  
   - Swagger: http://localhost:5080/swagger  
   - Migrations apply on startup in Development (`Database:ApplyMigrations: true`)

   See [apps/api/README.md](apps/api/README.md) for Cognito, migrations, and `/api/records` CRUD.

3. **Web** — after `sam deploy`, copy Cognito outputs into `.env` (see [apps/web/README.md](apps/web/README.md)):

   ```bash
   npm install
   cp apps/web/.env.example apps/web/.env
   # VITE_API_BASE_URL, VITE_COGNITO_* from stack outputs
   npm run dev
   ```

   Default: http://localhost:5173 — sign in with Google or register with email; visit `/protected` when authenticated.

## Frontend (`apps/web`)

```bash
npm install
cp apps/web/.env.example apps/web/.env
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run preview` | Serve production build locally |

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API base URL, no trailing slash (e.g. `http://localhost:5080`) |
| `VITE_COGNITO_*` | User pool, client, Hosted UI domain, OAuth redirect URLs — see [apps/web/README.md](apps/web/README.md) |

### Cognito authentication (web)

The SAM template provisions a **Cognito User Pool**, Hosted UI domain, app client, and **Google** sign-in. OAuth credentials live in **SSM SecureString** and are applied at deploy time via [scripts/deploy.ps1](scripts/deploy.ps1) ([docs/deployment.md](docs/deployment.md)).

- Register / sign in with email and password  
- **Continue with Google** (one or more Google accounts)  
- Protected routes, logout, session persistence — documented in **[apps/web/README.md](apps/web/README.md)**  

## Backend (`apps/api`)

Detailed docs: **[apps/api/README.md](apps/api/README.md)**.

| Area | Summary |
|------|---------|
| Auth | Amazon Cognito JWT on protected routes |
| Data | EF Core + PostgreSQL; generic `Record` entity (Id, Name, Description) |
| Local DB | Docker Compose; password auth |
| AWS DB | Optional RDS via SAM (`DeployDatabase=true`); API connects with **IAM DB auth** |
| Migrations | `dotnet ef` or `Database__ApplyMigrations=true` on startup (local dev) |

## Deploy to AWS (SAM)

1. Copy and edit SAM config:

   ```bash
   cp samconfig.toml.example samconfig.toml
   ```

2. Create the **deployment artifacts** S3 bucket once per account/region (separate from application data buckets such as other projects may use):

   ```bash
   aws s3 mb s3://jtj-epideixi-sam-artifacts --region us-east-1
   ```

3. Create Google OAuth parameters in SSM SecureString — [docs/deployment.md](docs/deployment.md).

4. Build and deploy (Lambda + Cognito + Google; database stays local unless you opt in):

   ```powershell
   .\scripts\deploy.ps1
   ```

5. Set `VITE_API_BASE_URL` and Cognito values in `apps/web/.env` from stack outputs.

### Optional: RDS PostgreSQL in AWS

1. Store the RDS **master** password in Parameter Store (SecureString):

   ```bash
   aws ssm put-parameter \
     --name epideixi_db_password \
     --type SecureString \
     --value 'YourSecureMasterPassword' \
     --overwrite
   ```

2. Deploy with database resources:

   ```bash
   .\scripts\deploy.ps1 -ExtraParameterOverrides 'DeployDatabase=true'
   ```

3. Create the IAM database user and apply migrations — [scripts/db/README.md](scripts/db/README.md).

`DeployDatabase` defaults to `false` in `samconfig.toml.example` so a normal deploy does not create RDS unless you choose to.

## CI

GitHub Actions (`.github/workflows/ci.yml`) on push/PR:

- **web** — `npm ci`, lint, build  
- **api** — `dotnet build` for `apps/api`

## Further reading

- [docs/deployment.md](docs/deployment.md) — secrets, SSM setup, deploy wrapper (`scripts/deploy.ps1`)  
- [apps/web/README.md](apps/web/README.md) — Cognito + Google OAuth setup, environment variables, auth flows  
- [apps/api/README.md](apps/api/README.md) — environment variables, endpoints, SAM parameters, free tier notes  
- [scripts/db/README.md](scripts/db/README.md) — RDS IAM user and migrations after deploy  
