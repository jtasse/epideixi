# Epideixi API

ASP.NET Core Web API that runs locally with Kestrel or on AWS Lambda behind API Gateway HTTP API. Requests to protected routes require a valid Amazon Cognito JWT.

## Prerequisites

- [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0) or newer
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) (for Lambda packaging and deployment)
- AWS credentials configured when deploying (`aws configure` or equivalent)

## Configuration

Settings are externalized via `appsettings.json`, environment variables, and (for local dev) `appsettings.Development.json` / user secrets.

| Setting | Environment variable | Description |
|---------|----------------------|-------------|
| `Cognito:Authority` | `Cognito__Authority` | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}` |
| `Cognito:Audience` | `Cognito__Audience` | Cognito app client ID |
| `Cors:AllowedOrigins` | `Cors__AllowedOrigins` | Comma-separated browser origins (e.g. `http://localhost:5173`) |

After the first SAM deploy, copy stack **Outputs** into `appsettings.Development.json` or user secrets:

```bash
dotnet user-secrets init --project apps/api
dotnet user-secrets set "Cognito:Authority" "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx" --project apps/api
dotnet user-secrets set "Cognito:Audience" "your-app-client-id" --project apps/api
```

## Run locally (Kestrel)

From the repository root:

```bash
cd apps/api
dotnet run
```

| URL | Auth |
|-----|------|
| http://localhost:5080/health | None |
| http://localhost:5080/api/sample | Cognito JWT (`Authorization: Bearer …`) |
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

Deploy:

```bash
cp samconfig.toml.example samconfig.toml
# Edit region/stack name or bucket name if needed
sam build
sam deploy
```

First deploy can use `sam deploy --guided` to confirm parameters.

Useful parameters:

- `CorsAllowedOrigins` — comma-separated origins for API Gateway CORS and the ASP.NET CORS policy (include your React dev server and production URL).

After deploy, set the React app `VITE_API_BASE_URL` to the **ApiBaseUrl** output (no trailing slash).

## Obtain a test JWT

1. Create a user in the Cognito User Pool (AWS Console → Cognito → Users, or AWS CLI).
2. Authenticate with the app client (Hosted UI, Amplify, or CLI `admin-initiate-auth` / SRP).
3. Pass the **access token** or **ID token** as `Authorization: Bearer <token>` in Swagger or curl.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness; no authentication |
| GET | `/api/sample` | Sample protected resource; requires Cognito JWT |
| GET | `/swagger` | Swagger UI |
| GET | `/swagger/v1/swagger.json` | OpenAPI document |
