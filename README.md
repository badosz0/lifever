# Lifever

Lifever is a calm, modular home for the everyday parts of life. It currently ships polished Reminders and Calendar experiences for the web and macOS, with a backend designed to grow into more life modules.

## Stack

- TypeScript, React 19, Vite 8
- Tailwind CSS 4 and local shadcn/ui components
- Hono API with Better Auth 1.6, deployable to Node.js or Cloudflare Workers
- Discord OAuth
- Prisma 7 with PostgreSQL locally and Cloudflare D1 in the Worker
- Tauri 2 for the native macOS shell
- pnpm workspaces

## Architecture

```text
apps/
  web/       React product UI, feature modules, shadcn components
  api/       authentication, session checks, services, Prisma access
  desktop/   thin Tauri host that embeds the web build
prisma/      schema and migrations
```

The browser and macOS app share the same UI build. Prisma, database credentials, Discord secrets, and trusted authorization decisions remain in the API process. Reminder and calendar queries are always scoped to the authenticated session's user ID; clients never choose a user ID.

Reminders and Calendar work immediately as a local profile and store guest data on the device. After Discord sign-in, the same interaction layer reads and writes authenticated collections through the API.

## Quick start

Requirements:

- Node `22.14.0` (see `.nvmrc`)
- pnpm `8.13.1` through Corepack
- Docker or another PostgreSQL 17-compatible server
- Rust `1.88.0` only when building the desktop app

```bash
nvm use
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The API listens at [http://localhost:8787](http://localhost:8787), with a health endpoint at `/api/health`.

The root `.env` is loaded by Prisma, the API, and Vite. Generate a production-quality Better Auth secret with:

```bash
openssl rand -base64 32
```

## Discord sign-in

Create an application in the Discord Developer Portal and place its credentials in `.env`:

```dotenv
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
```

Register this exact local redirect URI:

```text
http://localhost:8787/api/auth/callback/discord
```

For production, set `BETTER_AUTH_URL`, `WEB_URL`, and `VITE_API_URL` to the deployed HTTPS origins and register the matching `/api/auth/callback/discord` URI with Discord.

## Cloudflare Workers API

The API has separate Node.js and Cloudflare entry points over the same Hono
routes. Local development stays on Node and PostgreSQL with `pnpm dev:api`; the
Worker uses Cloudflare D1 and a Prisma client generated specifically for the
`cloudflare` runtime.

Test the Worker runtime locally:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm dev:worker
```

The production database and Worker are managed entirely with Wrangler. The D1
database only needs to be created once; its ID belongs in
`apps/api/wrangler.jsonc`:

```bash
pnpm --dir apps/api exec wrangler login
pnpm --dir apps/api exec wrangler d1 create lifever
pnpm db:deploy:d1
pnpm --dir apps/api exec wrangler secret put BETTER_AUTH_SECRET
pnpm deploy:worker
```

Apply the same migrations to the local Wrangler database before running
`pnpm dev:worker`:

```bash
pnpm db:deploy:d1:local
```

`WEB_URL` is the public web origin allowed by CORS; set it with
`wrangler secret put WEB_URL` when the web app has a public deployment.
`BETTER_AUTH_URL` normally does not need to be set because the Worker derives it
from the incoming request, including a custom domain. Set `DISCORD_CLIENT_ID`
and `DISCORD_CLIENT_SECRET` as Worker secrets when Discord sign-in is enabled,
and point the web build's `VITE_API_URL` at the deployed Worker.

## macOS app

The desktop app only needs the public API origin. Database credentials, Better
Auth secrets, and OAuth secrets always stay in the API environment. Desktop
commands save the public URL in the ignored `.env.desktop.local` file and prompt
for it the first time:

```bash
pnpm desktop:configure
```

Run the API in one terminal and the Tauri app in another:

```bash
pnpm dev:api
pnpm dev:worker      # API in the Cloudflare Workers runtime
pnpm desktop:dev
```

Build and install the macOS application with:

```bash
pnpm desktop:install
```

The installer builds an ad-hoc signed app, safely replaces the copy in
`/Applications` (or `~/Applications` when needed), verifies it, and opens the
new version. App data and login state are stored outside the bundle and survive
replacement. Updating from the current checkout is the same one-command flow:

```bash
pnpm desktop:update
```

Build a shareable application bundle and DMG without installing:

```bash
pnpm desktop:build
```

Install the latest public macOS release with Homebrew:

```bash
brew tap badosz0/lifever
brew install --cask lifever
```

After the tap has been added, updates use the normal Homebrew flow:

```bash
brew update
brew upgrade --cask lifever
```

Use `--api-url https://api.example.com` to change the endpoint for any desktop
command, or `--install-dir ~/Applications` to override the install location.
The release configuration embeds local, deterministic frontend assets and
grants no filesystem, shell, or process permissions. Distribution to other Macs
uses a universal DMG for Apple silicon and Intel. Public builds fall back to an
ad-hoc signature when a Developer ID identity is unavailable; a fully trusted
release needs a Developer ID signing identity and notarization credentials.

## Releasing

The release command is intentionally end-to-end. It verifies a clean and pushed
`main`, checks the workspace, builds and verifies a universal macOS DMG, applies
production D1 migrations, deploys the Cloudflare Worker, tags the source commit,
publishes the public GitHub Release, and updates the Homebrew cask checksum.

Prepare and commit a version, then publish it:

```bash
pnpm release:version 0.2.0
git add .
git commit -m "chore(release): prepare v0.2.0"
git push
pnpm release
```

Use `pnpm release -- --dry-run` to exercise the check and universal build
without changing production. `--skip-deploy` is only for resuming a partially
completed release after the API was already deployed. Release downloads live
alongside the source in the public
[Lifever repository](https://github.com/badosz0/lifever).

## Useful commands

```bash
pnpm dev             # web + API
pnpm check           # Prisma generation + all TypeScript/Tauri checks
pnpm build           # production API and web builds
pnpm build:worker    # bundle-check the Worker without deploying
pnpm deploy:api      # migrate production D1 and deploy the API Worker
pnpm deploy:worker   # deploy the API Worker
pnpm db:generate     # regenerate the Prisma client
pnpm db:migrate      # create/apply a local migration
pnpm db:deploy       # apply committed migrations in production
pnpm db:deploy:d1    # apply committed migrations to production D1
pnpm db:studio       # inspect PostgreSQL data
pnpm desktop:dev     # native shell with Vite HMR
pnpm desktop:build   # macOS app + DMG
pnpm desktop:install # build and install into Applications
pnpm desktop:update  # rebuild and replace the installed app
pnpm release:version # synchronize the next app version
pnpm release         # build, deploy, publish, and update Homebrew
```

## Product conventions

- Feature behavior lives under `src/features`; shared primitives live under `src/components/ui`.
- Components depend on semantic theme tokens, not raw light/dark colors.
- Frequent keyboard actions stay instant. Motion is reserved for state explanation and direct feedback.
- Destructive reminder and calendar actions are recoverable with Undo.
- Reduced motion, reduced transparency, high contrast, keyboard navigation, and touch targets are first-class constraints.
