# Epideixi Web

React SPA with **Amazon Cognito** authentication (email/password registration and **Sign in with Google**), protected routes, and session persistence across page refreshes.

## Prerequisites

- Node.js 20+
- A deployed Epideixi SAM stack (or existing Cognito User Pool with matching app client settings)
- For Google sign-in: Google Cloud OAuth 2.0 credentials

## Environment variables

Copy `.env.example` to `.env` and set values from CloudFormation **Outputs** after `sam deploy`:

| Variable | SAM output / source |
|----------|-------------------|
| `VITE_API_BASE_URL` | **ApiBaseUrl** |
| `VITE_COGNITO_USER_POOL_ID` | **CognitoUserPoolId** |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | **CognitoUserPoolClientId** |
| `VITE_AWS_REGION` | Deploy region (e.g. `us-east-1`) |
| `VITE_COGNITO_DOMAIN` | **CognitoHostedUiDomain** prefix, or hostname from **CognitoHostedUiUrl** without `https://` (e.g. `epideixi-863942760469.auth.us-east-1.amazoncognito.com`) |
| `VITE_COGNITO_REDIRECT_SIGN_IN` | `http://localhost:5173/auth/callback` (must match User Pool client callback URLs) |
| `VITE_COGNITO_REDIRECT_SIGN_OUT` | `http://localhost:5173` |

Vite exposes only variables prefixed with `VITE_`.

## Cognito setup (AWS)

### 1. Deploy or update the stack

From the repo root:

```powershell
.\scripts\deploy.ps1
```

The template creates a User Pool, Hosted UI domain, Google federation, and an app client with callback URLs for local dev.

### 2. Google OAuth (required once per account)

Each user can pick their Google account on the consent screen; Cognito links federated users by email.

1. **Google Cloud Console** → APIs & Services → Credentials → Create **OAuth 2.0 Client ID** (Web application).
2. **Authorized JavaScript origins** (local dev): `http://localhost:5173`
3. **Authorized redirect URIs** — Cognito’s IdP response URL, **not** the React app URL:

   ```text
   https://<CognitoHostedUiDomain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```

4. Store `client_id` and `client_secret` in **SSM Parameter Store** as **SecureString** (`epideixi_google_client_id`, `epideixi_google_client_secret`), then deploy with **`.\scripts\deploy.ps1`**.

   Why a wrapper, IAM, and options: **[docs/deployment.md](../../docs/deployment.md)**.

### 3. Configure the React app

```bash
cp apps/web/.env.example apps/web/.env
# Fill in pool id, client id, domain from stack outputs
npm install
npm run dev
```

Open http://localhost:5173.

## Authentication flows

| Flow | How |
|------|-----|
| **Register** | `/login` → Register → email verification code → Confirm |
| **Login (email)** | `/login` → email + password |
| **Login (Google)** | Continue with Google → Cognito Hosted UI / Google → `/auth/callback` |
| **Logout** | Header **Sign out** (global sign-out clears federated session) |
| **Protected routes** | `/protected` redirects to `/login` when unauthenticated |
| **Session persistence** | Amplify stores tokens in `localStorage`; restored on refresh |

Signed-in user **email**, **name**, and **user ID** appear on the home and protected pages.

## Commands

```bash
npm run dev      # from repo root: npm run dev
npm run build
npm run lint
```

## Production hosting (Amplify)

To deploy the SPA on **Amplify Hosting** with the default `https://main.<id>.amplifyapp.com` URL, follow **[docs/hosting-amplify.md](../../docs/hosting-amplify.md)**. The repo includes `amplify.yml` at the root; env var templates are in `.env.amplify.example`.

## Troubleshooting

| Issue | Check |
|-------|--------|
| Redirect URI mismatch | Cognito app client callbacks include exact `/auth/callback` URL |
| Google `redirect_uri_mismatch` | Google Console uses `.../oauth2/idpresponse` on the Cognito domain |
| `invalid_client` on Google | SSM values match Google Console; redeploy with `.\scripts\deploy.ps1`; see [docs/deployment.md](../../docs/deployment.md) |
| Cognito Hosted UI `invalid_request` | `.env` **CognitoUserPoolClientId** matches current **CognitoUserPoolClientId** stack output |
| API 401 on protected page | `VITE_API_BASE_URL` and Cognito app client ID match API `Cognito:Audience` |

See also the [root README](../../README.md) and [API README](../api/README.md).
