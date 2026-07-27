# Self-hosting Lifever

Lifever uses one backend architecture: a Hono API on Cloudflare Workers with a
Cloudflare D1 database. The React client is static and requires a signed-in
account; there is no separate device-only data profile.

## Configuration

The Worker uses these variables and secrets:

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Random server secret with at least 32 characters |
| `BETTER_AUTH_URL` | Public API origin when it cannot be inferred from the request |
| `WEB_URL` | Public frontend origin allowed by CORS |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret |
| `GOOGLE_CALENDAR_CLIENT_ID` | Optional Google OAuth web client ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Optional Google OAuth web client secret |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | Separate secret used to encrypt Google refresh tokens |
| `VITE_API_URL` | Public API origin embedded into a web or desktop build |

Generate independent secrets:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

The OAuth redirect URIs are:

```text
https://YOUR_API_ORIGIN/api/auth/callback/discord
https://YOUR_API_ORIGIN/api/calendar-integrations/google/callback
```

The Google Calendar integration is optional. Enable the Google Calendar API,
create a **Web application** OAuth client, and register the exact callback
above. Refresh tokens are encrypted before they are stored.

Never place auth, OAuth, or encryption secrets in `VITE_API_URL` or another
frontend variable.

## Create the Cloudflare resources

Authenticate Wrangler and create the D1 database:

```bash
pnpm --dir apps/api exec wrangler login
pnpm --dir apps/api exec wrangler d1 create lifever
```

Copy the returned database ID into `apps/api/wrangler.jsonc`. Update the custom
domain there as needed, then add Worker secrets:

```bash
pnpm --dir apps/api exec wrangler secret put BETTER_AUTH_SECRET
pnpm --dir apps/api exec wrangler secret put WEB_URL
pnpm --dir apps/api exec wrangler secret put DISCORD_CLIENT_ID
pnpm --dir apps/api exec wrangler secret put DISCORD_CLIENT_SECRET
pnpm --dir apps/api exec wrangler secret put GOOGLE_CALENDAR_CLIENT_ID
pnpm --dir apps/api exec wrangler secret put GOOGLE_CALENDAR_CLIENT_SECRET
pnpm --dir apps/api exec wrangler secret put CALENDAR_TOKEN_ENCRYPTION_KEY
```

`BETTER_AUTH_URL` is optional when the public auth origin matches the incoming
request origin. Add it as a Worker secret if a proxy changes that origin.

## Deploy

Apply every committed D1 migration, generate the Prisma client, and deploy the
Worker:

```bash
pnpm deploy:api
```

Verify the deployment:

```bash
curl https://YOUR_API_ORIGIN/api/health
```

Build the frontend with the public Worker origin:

```bash
VITE_API_URL=https://YOUR_API_ORIGIN pnpm --filter @lifever/web build
```

Deploy `apps/web/dist` to a static host and set `WEB_URL` to that exact
frontend origin.

## Local Worker development

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:deploy:local
pnpm dev
```

Wrangler keeps the local D1 database outside application source. Configure a
Discord OAuth application with
`http://localhost:8787/api/auth/callback/discord` before signing in.

## Desktop clients

Desktop builds contain only the public API origin:

```bash
pnpm desktop:configure -- --api-url https://YOUR_API_ORIGIN
pnpm desktop:build
```

On Windows, build the x64 NSIS setup executable directly:

```powershell
$env:VITE_API_URL="https://YOUR_API_ORIGIN"
pnpm --filter @lifever/desktop tauri build --bundles nsis --ci
```

Backend secrets remain in Cloudflare.

## Operations

- Back up D1 before destructive schema changes.
- Apply committed migrations before deploying API code that depends on them.
- Keep `BETTER_AUTH_SECRET` stable; rotating it invalidates existing sessions.
- Keep `CALENDAR_TOKEN_ENCRYPTION_KEY` stable while encrypted Google tokens exist.
- Restrict `WEB_URL` to the frontend origin you operate.
- Monitor `/api/health` and Worker observability after deployments.
