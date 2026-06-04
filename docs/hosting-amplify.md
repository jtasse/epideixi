# Host the web app on Amplify (default AWS URL)

Production URL for this project:

```text
https://main.d19k8pc8uckpy8.amplifyapp.com
```

The API stays on SAM (Lambda + API Gateway + Cognito). Amplify only serves static files from `apps/web/dist`.

## Where each setting lives

| What | Where to check or edit | This project |
|------|------------------------|------------|
| **Amplify site URL** | AWS Console → **Amplify** → app **epideixi** → **Hosting** → branch **main** → domain | `https://main.d19k8pc8uckpy8.amplifyapp.com` |
| **Amplify build env vars** (`VITE_*`) | Same app → **Hosting** → **Environment variables** (branch **main**) | Must match [apps/web/.env.amplify.example](../apps/web/.env.amplify.example) |
| **Local dev env vars** | File `apps/web/.env` on your machine (not Amplify) | Keep `http://localhost:5173` redirects |
| **API + Cognito deploy config** | File `samconfig.toml` at repo root (gitignored) | `CorsAllowedOrigins` + `SpaAllowedOrigin` include Amplify URL |
| **Cognito callback URLs (live)** | AWS Console → **Cognito** → User pools → `epideixi-users` → App integration → App client **spa-client** → Hosted UI / OAuth URLs — or CLI after `deploy.ps1` | Must list Amplify `.../auth/callback` and localhost |
| **API CORS (live)** | Deployed via SAM `CorsAllowedOrigins` in `samconfig.toml` | Must include `https://main.d19k8pc8uckpy8.amplifyapp.com` (no path) |
| **Google OAuth secrets** | SSM Parameter Store + `scripts/deploy.ps1` | Not in Amplify or `.env` |
| **Stack outputs** (pool id, client id, API URL) | AWS Console → **CloudFormation** → stack **epideixi** → **Outputs** — or `aws cloudformation describe-stacks --stack-name epideixi` | See `.env.amplify.example` |

## Overview

```text
GitHub (epideixi) → Amplify build (amplify.yml) → https://main.<id>.amplifyapp.com
                                                      ↓ JWT / API calls
                                              API Gateway + Cognito (SAM)
```

## 1. Connect Amplify to GitHub

1. AWS Console → **Amplify** → **Create new app** → **Host web app**.
2. Choose **GitHub**, authorize, select the **epideixi** repository.
3. Branch: **main** (or your default).
4. **Monorepo app root:** `apps/web` (Amplify uses **`apps/web/amplify.yml`**, artifact folder **`dist`**).
   If monorepo is **off**, use repo-root **`amplify.yml`** and artifact **`apps/web/dist`**.
5. Console build settings (when not using YAML): build `npm run build` from repo root via `cd ../..` in `apps/web/amplify.yml`, or match the yml — output **`dist`** when app root is `apps/web`.
6. Set all **`VITE_*`** environment variables (see below) **before** expecting a good deploy — the build calls `requireEnv()` and will fail without them.

7. After the app is created, open the app → copy the **default domain** for the `main` branch, e.g.:

   ```text
   https://main.d1abc2def3ghi4.amplifyapp.com
   ```

   No trailing slash. This is your **`SpaAllowedOrigin`**.

## 2. Update the SAM stack (Cognito + CORS)

Edit **`samconfig.toml`** at the repo root so `parameter_overrides` includes both localhost and Amplify (already set for `d19k8pc8uckpy8` if you pulled latest).

Redeploy the API stack:

```powershell
.\scripts\deploy.ps1
```

`SpaAllowedOrigin` and `CorsAllowedOrigins` in `samconfig.toml` register Cognito callbacks and API CORS for Amplify without removing localhost.

## 3. Configure Amplify environment variables

**AWS Console** → **Amplify** → your app → **Hosting** → **Environment variables** → branch **main**.

Copy every line from [apps/web/.env.amplify.example](../apps/web/.env.amplify.example) (name = key, value = right-hand side). Then **Redeploy this version** on branch **main** (Hosting → select latest deployment → Redeploy).

Local dev keeps using `apps/web/.env` with `http://localhost:5173` redirects.

## 4. Google Cloud (if using Google sign-in)

Authorized redirect URI stays Cognito’s IdP URL (`.../oauth2/idpresponse`). Optionally add your Amplify origin under **Authorized JavaScript origins**.

## 5. Verify

1. Open the Amplify URL → home page loads.
2. **Continue with Google** or email login → returns to `/auth/callback` → session works.
3. **Protected** page → API call succeeds (CORS includes Amplify origin).

## Cost

Amplify **Hosting** for a small static SPA is often **$0/month** within free allowances (build minutes, GB served, storage). See [Amplify pricing](https://aws.amazon.com/amplify/pricing/). This does not include Lambda/Cognito/API charges from SAM.

## Troubleshooting

| Issue | Check |
|-------|--------|
| **Welcome** placeholder page | Build failed or wrong artifact path — see below |
| Build fails on Amplify | All `VITE_*` env vars set; monorepo root `apps/web` → `apps/web/amplify.yml` + **`dist`** (not `apps/web/dist`) |
| 404 on `/login`, `/auth/callback`, or refresh | SPA rewrites in `amplify.yml` **and** `dist/404.html` (copied from `index.html` at build). Redeploy Amplify after push. In **Network**, `GET /auth/callback` should be **200**, not 404. |
| Google sign-in lands on `/login` with console 404 | Usually `/auth/callback` returned 404 before React ran — fix rewrites + redeploy; duplicate-email error should appear in the login banner after fix |
| Cognito redirect error | `VITE_COGNITO_REDIRECT_*` match Amplify URL exactly; `SpaAllowedOrigin` deployed via `scripts/deploy.ps1` |
| API CORS error | `CorsAllowedOrigins` in `samconfig.toml` includes the Amplify origin (no path) |

### “Welcome — complete your first deployment”

Amplify shows this when **no successful build artifacts** were published ([Amplify docs](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-website.html)). Common causes:

1. **Wrong artifact path** — monorepo app root `apps/web` requires **`baseDirectory: dist`** (`apps/web/amplify.yml`), not `apps/web/dist`.
2. **Build failed** — Amplify → **Deployments** → latest → **View logs**. Missing `VITE_*` env vars fails the Vite build.
3. **Fix** — commit `apps/web/amplify.yml`, push to GitHub, **Redeploy this version**.

See also [deployment.md](deployment.md) and [apps/web/README.md](../apps/web/README.md).
