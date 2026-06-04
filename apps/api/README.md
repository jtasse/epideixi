# Epideixi API

ASP.NET Core Web API with **PostgreSQL** (Entity Framework Core), **Amazon Cognito** JWT authentication, and optional deployment to **AWS Lambda** via SAM. Runs locally with Kestrel or behind API Gateway HTTP API.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (matches Lambda `dotnet8` runtime; repo `global.json` pins SDK 8)
- [Docker](https://www.docker.com/) for local PostgreSQL (`docker compose` from repo root)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) (Lambda packaging and deployment)
- AWS credentials when deploying (`aws configure` or equivalent)

## Configuration

Settings are externalized via `appsettings.json`, environment variables, and (for local dev) `appsettings.Development.json` / user secrets.

| Setting | Environment variable | Description |
|---------|----------------------|-------------|
| `Cognito:Authority` | `Cognito__Authority` | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}` |
| `Cognito:Audience` | `Cognito__Audience` | Cognito app client ID |
| `Cors:AllowedOrigins` | `Cors__AllowedOrigins` | Comma-separated browser origins (e.g. `http://localhost:5173`) |
| `Database:Host` | `Database__Host` | PostgreSQL hostname |
| `Database:Port` | `Database__Port` | PostgreSQL port (default `5432`) |
| `Database:Name` | `Database__Name` | Database name |
| `Database:Username` | `Database__Username` | Database user |
| `Database:Password` | `Database__Password` | Password (local dev; omit when using IAM) |
| `Database:UseIamAuth` | `Database__UseIamAuth` | `true` for RDS IAM auth tokens |
| `Database:Region` | `Database__Region` | AWS region for IAM token generation |
| `Database:ApplyMigrations` | `Database__ApplyMigrations` | `true` to run EF migrations on startup |

After the first SAM deploy, copy stack **Outputs** into `appsettings.Development.json` or user secrets:

```bash
dotnet user-secrets init --project apps/api
dotnet user-secrets set "Cognito:Authority" "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx" --project apps/api
dotnet user-secrets set "Cognito:Audience" "your-app-client-id" --project apps/api
```

## PostgreSQL (local)

Start a persistent local database from the repository root:

```bash
docker compose up -d
```

Defaults match `appsettings.Development.json` (`epideixi` / `epideixi` on port `5432`). Data is stored in the Docker volume `epideixi_pgdata` and survives container restarts.

### Migrations

Install EF tools once:

```bash
dotnet tool restore
```

**Option A — apply on startup (local dev default)**  
`appsettings.Development.json` sets `Database:ApplyMigrations` to `true`, so `dotnet run` applies pending migrations automatically.

**Option B — apply manually**

```bash
cd apps/api
dotnet ef database update
```

Create a new migration after model changes:

```bash
cd apps/api
dotnet ef migrations add <MigrationName> --output-dir Data/Migrations
dotnet ef database update
```

> Design-time commands (`dotnet ef`) require password auth. Set `Database__UseIamAuth=false` locally.

## Run locally (Kestrel)

From the repository root:

```bash
docker compose up -d
cd apps/api
dotnet run
```

| URL | Auth |
|-----|------|
| http://localhost:5080/health | None |
| http://localhost:5080/api/sample | Cognito JWT (`Authorization: Bearer …`) |
| http://localhost:5080/api/records | Cognito JWT — CRUD for `Record` entities |
| http://localhost:5080/swagger | None (use **Authorize** for protected routes) |

### Sample responses

**GET /health**

```json
{
  "data": { "status": "healthy", "service": "epideixi-api" },
  "meta": { "timestamp": "2026-06-03T12:00:00+00:00", "requestId": "…" }
}
```

**GET /api/sample** (authenticated)

```json
{
  "data": {
    "subject": "user-uuid",
    "email": "you@example.com",
    "scopes": []
  },
  "meta": { "timestamp": "…", "requestId": "…" }
}
```

**Missing/invalid JWT** → `401` with structured JSON (`code`: `unauthorized`).

### Records CRUD (`/api/records`)

All record endpoints require a Cognito JWT. Bodies use camelCase JSON.

**POST /api/records**

```json
{
  "name": "Example",
  "description": "Optional description"
}
```

**Response** (`201 Created`): `data` contains `id` (GUID), `name`, `description`, plus `meta.timestamp` / `meta.requestId`.

**PUT /api/records/{id}`** — same shape as POST body. **DELETE** returns `204` when successful.

## Run locally (SAM + Lambda)

From the repository root:

```bash
sam build
cp apps/api/local-env.json.example apps/api/local-env.json
# Edit local-env.json with Cognito Authority and Audience from a deploy (or template outputs)
cp samconfig.toml.example samconfig.toml
sam local start-api
```

The emulated API is typically available at http://127.0.0.1:3000.

## Deploy (AWS SAM)

Epideixi uses a **dedicated S3 bucket** for Lambda deployment packages (not the SAM CLI managed bucket or meowlin app buckets). `samconfig.toml` sets `s3_bucket = "jtj-epideixi-sam-artifacts"` and `resolve_s3 = false`.

Create the bucket once per account/region (if it does not exist):

```bash
aws s3 mb s3://jtj-epideixi-sam-artifacts --region us-east-1
```

Deploy (Lambda + Cognito + Google; local Docker for Postgres):

```powershell
cp samconfig.toml.example samconfig.toml
.\scripts\deploy.ps1
```

See [docs/deployment.md](../../docs/deployment.md) for SSM Google OAuth setup and why the wrapper is used.

Deploy **with RDS PostgreSQL (IAM auth)**:

```powershell
.\scripts\deploy.ps1 -ExtraParameterOverrides 'DeployDatabase=true'
```

Create or update the parameter (if not already present):

```bash
aws ssm put-parameter \
  --name epideixi_db_password \
  --type SecureString \
  --value 'YourSecureMasterPassword' \
  --overwrite
```

The template resolves the RDS master password from SSM at deploy time (`DatabaseMasterPasswordSsmName`, default `epideixi_db_password`). The deploy principal needs `ssm:GetParameter` on that parameter.

After RDS is available, follow **[scripts/db/README.md](../../scripts/db/README.md)** (IAM user SQL + `dotnet ef database update`). Production Lambda keeps `Database__ApplyMigrations=false`; apply migrations from your workstation or CI.

Useful parameters:

- `CorsAllowedOrigins` — comma-separated origins for API Gateway CORS and the ASP.NET CORS policy.
- `DeployDatabase` — `true` provisions VPC + `db.t4g.micro` PostgreSQL with IAM authentication enabled.
- `DatabaseMasterPasswordSsmName` — SSM Parameter Store name for RDS master password (default `epideixi_db_password`; API uses IAM user `iam_api` at runtime).

After deploy, set the React app `VITE_API_BASE_URL` to the **ApiBaseUrl** output (no trailing slash).

### AWS free tier and SAM notes

| Item | SAM / free tier |
|------|-----------------|
| RDS `db.t4g.micro` | Often covered for new accounts (~750 hrs/month for 12 months); **not** always free after that |
| Lambda + API Gateway | Generally within free tier at demo traffic |
| VPC, subnets, IGW | No charge for the VPC itself |
| NAT Gateway | **Not used** in this template (Lambda uses public subnets + IGW) |
| RDS IAM auth | Supported; no extra charge for the feature |
| Running migrations on Lambda | Disabled by default (`Database__ApplyMigrations=false`); use `dotnet ef database update` against RDS from CI or your workstation |

**Cannot rely on free tier for:** always-on RDS after the introductory period, production-grade HA (Multi-AZ), or high storage/backup costs. **Optional RDS** defaults to `DeployDatabase=false` so `sam deploy` does not create a database unless you opt in.

## Obtain a test JWT

1. Create a user in the Cognito User Pool (AWS Console → Cognito → Users, or AWS CLI).
2. Authenticate with the app client (Hosted UI, Amplify, or CLI `admin-initiate-auth` / SRP).
3. Pass the **access token** or **ID token** as `Authorization: Bearer <token>` in Swagger or curl.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness; no authentication |
| GET | `/api/sample` | Sample protected resource; requires Cognito JWT |
| GET | `/api/records` | List records |
| GET | `/api/records/{id}` | Get record by id |
| POST | `/api/records` | Create record |
| PUT | `/api/records/{id}` | Update record |
| DELETE | `/api/records/{id}` | Delete record |
| GET | `/swagger` | Swagger UI |
| GET | `/swagger/v1/swagger.json` | OpenAPI document |

## Data model

| Column | Type | Notes |
|--------|------|--------|
| `Id` | `uuid` | Generated on create |
| `Name` | `string` | Required, max 200 characters |
| `Description` | `string` | Optional, max 2000 characters |

Table name: `records` (see `Data/Migrations/`).
