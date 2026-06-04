# Deployment and secrets

How Epideixi deploys to AWS with SAM, where secrets live, and why we use a small deploy wrapper

## Quick start

1. One-time: [Google OAuth in SSM](#google-oauth-sign-in-with-google) and `samconfig.toml` (from [samconfig.toml.example](../samconfig.toml.example)).
2. To deploy from the repo root:

   ```powershell
   .\scripts\deploy.ps1
   ```

   That runs `sam build`, reads Google credentials from SSM, and runs `sam deploy` with the minimum extra parameters Cognito needs.

## Why a wrapper script?

In a word: cost. While CloudFormation can reference **SSM SecureString** directly for some resources (for example RDS master password in this template), **Cognito `UserPoolIdentityProvider` cannot** (as AWS does not allow `{{resolve:ssm-secure:...}}` or `AWS::SSM::Parameter::Value<SecureString>` on Google `ProviderDetails`). 

> **NOTE**: Though we *could* use AWS Secrets Manager to store these values and access them from Cognito, this approach allows us to bypass the costs associated with Secret Manager (at the cost of some complexity, of course).

| Goal | Option |
|------|--------|
| KMS-encrypted OAuth creds in **SSM SecureString**, no Secrets Manager fee | **This repo:** `scripts/deploy.ps1` reads SSM and passes `GoogleClientId` / `GoogleClientSecret` as **deploy-time only** SAM parameters |
| No wrapper, no fee | SSM **String** parameters + template `AWS::SSM::Parameter::Value<String>` (weaker; secret not stored as SecureString) |
| No wrapper, KMS in AWS | **Secrets Manager** (~$0.40/secret/month) + dynamic references in the template |

We chose **SSM SecureString + wrapper** so Google sign-in stays encrypted in Parameter Store without Secrets Manager cost or extra template resources. The script is intentionally small: one SSM read path, then standard `sam deploy`.

**Do not** put Google OAuth values in `samconfig.toml` or git. They exist only in SSM and in CloudFormation’s stack state after deploy (same as any parameter passed at deploy time).

## What `scripts/deploy.ps1` does

1. Resolves repo root and AWS region (`AWS_REGION`, `AWS_DEFAULT_REGION`, or `us-east-1`).
2. Calls `aws ssm get-parameter --with-decryption` for:
   - `epideixi_google_client_id` (default name)
   - `epideixi_google_client_secret` (default name)
   - Optionally `epideixi_cognito_ses_source_arn` and `epideixi_cognito_email_from` (both required to enable SES mail)
3. Unless `-SkipBuild` is set, runs `sam build`.
4. Runs `sam deploy` with:

   ```text
   --parameter-overrides GoogleClientId=... GoogleClientSecret=...
   ```

   All other settings (stack name, S3 bucket, `CorsAllowedOrigins`, `DeployDatabase`, etc.) come from **`samconfig.toml`**.

### Script options

| Flag / argument | Purpose |
|-----------------|--------|
| `-SkipBuild` | Deploy only; skip `sam build` |
| `-Region us-west-2` | Override region for SSM reads |
| `-GoogleClientIdSsmName` / `-GoogleClientSecretSsmName` | Non-default SSM parameter names |
| `-CognitoSesSourceArnSsmName` / `-CognitoEmailFromSsmName` | Optional SES parameters for Cognito email (see below) |
| `-ExtraParameterOverrides 'DeployDatabase=true'` | Merged with Google overrides (e.g. enable RDS) |
| Extra args after `--` | Forwarded to `sam deploy` (e.g. `--no-confirm-changeset`) — do not pass a second `--parameter-overrides` here |

Examples:

```powershell
.\scripts\deploy.ps1
.\scripts\deploy.ps1 -SkipBuild
.\scripts\deploy.ps1 -- --no-confirm-changeset
.\scripts\deploy.ps1 -ExtraParameterOverrides 'DeployDatabase=true'
```

**IAM:** the principal running the script needs `ssm:GetParameter` on those parameters (with decryption) plus normal SAM/CloudFormation deploy permissions.

## Google OAuth (Sign in with Google)

### One-time setup (per AWS account / region)

1. Create a **Web application** OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. **Authorized JavaScript origins** (local dev): `http://localhost:5173`
3. **Authorized redirect URI** — Cognito IdP callback, **not** the React app URL:

   ```text
   https://<CognitoHostedUiDomain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```

   Use stack output **CognitoHostedUiUrl** after the first deploy (domain prefix is in **CognitoHostedUiDomain**).

4. Store credentials in **SSM Parameter Store** as **SecureString** (recommended):

   ```powershell
   aws ssm put-parameter --name epideixi_google_client_id --type SecureString `
     --value "YOUR_CLIENT_ID.apps.googleusercontent.com" --overwrite --region us-east-1

   aws ssm put-parameter --name epideixi_google_client_secret --type SecureString `
     --value "YOUR_CLIENT_SECRET" --overwrite --region us-east-1
   ```

5. Deploy with the wrapper (see [Quick start](#quick-start)).

Rotating credentials: update the SSM parameters, then run `.\scripts\deploy.ps1` again so CloudFormation updates the Cognito Google IdP.

**Never** deploy with placeholder Google values (`test-id` / `test-secret`) — Cognito will store them and Google sign-in will fail everywhere with “The OAuth client was not found.”

### What does *not* need custom logic

- Cognito User Pool, Hosted UI domain, app client (Google + email), Lambda, HTTP API — all defined in `template.yaml`.
- RDS master password when `DeployDatabase=true` — template uses SSM SecureString dynamic reference on the RDS resource (no wrapper).

Only **Google OAuth → Cognito IdP** needs the wrapper bridge.

### Email sign-up verification

Gmail and other providers often mark Cognito’s built-in sender (`no-reply@verificationemail.com`) as spam. **Use Amazon SES** in the **same region** as the stack so Cognito sends as `DEVELOPER` with your verified address and an HTML template (paragraphs, code emphasis, repo link).

#### One-time SES setup (recommended)

1. Open **Amazon SES** in the deploy region (e.g. `us-east-1`).
2. **Verify an identity** — a **domain** (best: enable DKIM on the domain) or a single **email** you control.
3. If the account is still in the **SES sandbox**, you can only send to verified addresses until you [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
4. Note the identity **ARN**, for example:
   - Email: `arn:aws:ses:us-east-1:123456789012:identity/you@example.com`
   - Domain: `arn:aws:ses:us-east-1:123456789012:identity/example.com`
5. Store two **SSM parameters** (String or SecureString):

   | Parameter | Example value |
   |-----------|----------------|
   | `epideixi_cognito_ses_source_arn` | ARN from step 4 |
   | `epideixi_cognito_email_from` | `Epideixi <noreply@example.com>` (must use the verified address or a subdomain of a verified domain) |

   ```powershell
   aws ssm put-parameter --name epideixi_cognito_ses_source_arn --type String --value "arn:aws:ses:us-east-1:ACCOUNT:identity/example.com" --overwrite
   aws ssm put-parameter --name epideixi_cognito_email_from --type String --value "Epideixi <noreply@example.com>" --overwrite
   ```

6. Redeploy: `.\scripts\deploy.ps1` (the script passes `CognitoSesSourceArn` and `CognitoEmailFrom` when both SSM values exist).

Without those parameters, the stack keeps `COGNITO_DEFAULT` (limited volume, spam-prone sender). The fallback body uses `\r\n` line breaks; many clients still collapse them — **SES + HTML** is what fixes layout.

Repo link in the message comes from template parameter `GitHubRepositoryUrl` (default `https://github.com/jtasse/epideixi`).

Redeploy after any template or SSM change: `.\scripts\deploy.ps1`.

### Duplicate email (Google vs password)

A **Pre Sign-up** Lambda (`apps/cognito-triggers/pre-signup`) blocks creating a second Cognito user when the same email is already registered via Google or email/password. The SPA shows: *An account associated with this email already exists. Sign in with your existing method instead.*

Deploy stack updates so the trigger is attached to the user pool (`.\scripts\deploy.ps1`).

## RDS master password (optional)

When `DeployDatabase=true`, the RDS master password is read from SSM SecureString parameter `epideixi_db_password` (name overridable via `DatabaseMasterPasswordSsmName`). No script change required for that path.

See [scripts/db/README.md](../scripts/db/README.md) for IAM DB user and migrations.

## `samconfig.toml`

Safe to commit (via example file): stack name, region, S3 bucket, `CorsAllowedOrigins`, `DeployDatabase`, etc.

Never commit: Google OAuth values or parameter overrides that embed secrets.

## Deploying without the wrapper (not recommended)

` sam deploy` alone leaves `GoogleClientId` / `GoogleClientSecret` empty and breaks Google sign-in. If you must run SAM directly, pass overrides yourself (values will appear in your shell history / process list):

```powershell
$id = aws ssm get-parameter --name epideixi_google_client_id --with-decryption --query Parameter.Value --output text
$secret = aws ssm get-parameter --name epideixi_google_client_secret --with-decryption --query Parameter.Value --output text
sam build
sam deploy --parameter-overrides "GoogleClientId=$id" "GoogleClientSecret=$secret"
```

## CI / GitHub Actions

CI builds and tests only; it does not deploy. A pipeline would mirror the wrapper: read SSM (or use OIDC + `GetParameter`), then `sam deploy` with the same two parameter overrides—without storing secrets in the workflow YAML.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Script: SSM parameters missing | Create `epideixi_google_client_id` / `_secret` in the same region as deploy |
| Deploy OK, Google `invalid_client` | SSM values must match Google Console; redirect URI must be `.../oauth2/idpresponse` |
| Cognito Hosted UI `invalid_request` | Stale `VITE_COGNITO_USER_POOL_CLIENT_ID` in `apps/web/.env` — refresh **CognitoUserPoolClientId** output |
| Verification email in spam / one long line | Configure SES SSM parameters above and redeploy; mark one message “Not spam” only helps your mailbox |
| SES deploy error on User Pool | `From` must match verified identity; SES region must match stack region |
| `sam deploy` not using your config | Run from repo root; ensure `samconfig.toml` exists |
| `sam build` / SDK **8.0.100** not found | .NET 8 may be in `%USERPROFILE%\AppData\Local\Microsoft\dotnet` but not on PATH — run `.\dotnet-install.ps1 -Channel 8.0`, or `winget install Microsoft.DotNet.SDK.8`; `deploy.ps1` prepends the user-local SDK when present |

Web app details: [apps/web/README.md](../apps/web/README.md).

Production SPA hosting: [hosting-amplify.md](hosting-amplify.md).
