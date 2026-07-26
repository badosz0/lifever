# Self-hosting Lifever

Lifever separates the static React client from its authenticated API. The client
also has a fully local profile, while signed-in data is stored by the API.

Two backend deployments are supported:

- **Cloudflare Workers + D1** — the production-oriented, low-maintenance path.
- **Node.js + PostgreSQL** — a conventional server or container deployment.

## Configuration

Start from [.env.example](.env.example). These are the important values:

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Random server secret with at least 32 characters |
| `BETTER_AUTH_URL` | Public API origin |
| `WEB_URL` | Public frontend origin allowed by CORS |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret |
| `VITE_API_URL` | API origin embedded into the frontend build |
| `DATABASE_URL` | PostgreSQL connection string for the Node runtime |
| `PORT` | Optional Node API port; defaults to `8787` |

Generate the auth secret with:

```bash
openssl rand -base64 32
```

The Discord redirect URI is always:

```text
https://YOUR_API_ORIGIN/api/auth/callback/discord
```

Never place database credentials, auth secrets, or OAuth secrets in
`VITE_API_URL` or any other frontend variable.

## Cloudflare Workers and D1

Authenticate Wrangler and create the database once:

```bash
pnpm --dir apps/api exec wrangler login
pnpm --dir apps/api exec wrangler d1 create lifever
```

Copy the returned database ID into `apps/api/wrangler.jsonc`, then configure
Worker secrets:

```bash
pnpm --dir apps/api exec wrangler secret put BETTER_AUTH_SECRET
pnpm --dir apps/api exec wrangler secret put WEB_URL
pnpm --dir apps/api exec wrangler secret put DISCORD_CLIENT_ID
pnpm --dir apps/api exec wrangler secret put DISCORD_CLIENT_SECRET
```

`BETTER_AUTH_URL` is optional for Workers because Lifever derives it from the
incoming request. Set it as a secret when the externally visible auth origin
differs from the request origin.

Apply migrations and deploy the API:

```bash
pnpm deploy:api
```

This runs the committed D1 migrations before deploying the Worker. Verify it:

```bash
curl https://YOUR_API_ORIGIN/api/health
```

Build the frontend with the public Worker origin:

```bash
VITE_API_URL=https://YOUR_API_ORIGIN pnpm --filter @lifever/web build
```

Deploy `apps/web/dist` to any static host and set `WEB_URL` to that frontend
origin.

### Local Worker runtime

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:deploy:d1:local
pnpm dev:worker
```

Wrangler stores its local D1 data outside the application source.

## Node.js and PostgreSQL

Copy the environment template and replace every production value:

```bash
cp .env.example .env
```

At minimum, production needs:

```dotenv
NODE_ENV="production"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lifever?schema=public"
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://api.example.com"
WEB_URL="https://lifever.example.com"
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
VITE_API_URL="https://api.example.com"
```

Apply migrations and build:

```bash
pnpm db:deploy
pnpm build
```

Start the API:

```bash
pnpm --filter @lifever/api start
```

Serve `apps/web/dist` from a static host or reverse proxy. Proxy the API origin
with HTTPS and preserve cookies and request headers.

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

Backend secrets must remain on the server.

## Operations

- Back up PostgreSQL or D1 before destructive schema changes.
- Apply committed migrations before deploying API code that depends on them.
- Keep `BETTER_AUTH_SECRET` stable; rotating it invalidates existing sessions.
- Restrict `WEB_URL` to the frontend origin you operate.
- Monitor `/api/health` and Worker observability after deployments.
