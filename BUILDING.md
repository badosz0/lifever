# Building Lifever

This guide covers local development, production builds, desktop apps, and
releases. For deployment configuration, see [SELF_HOSTING.md](SELF_HOSTING.md).

## Requirements

- Node `22.14.0` from [.nvmrc](.nvmrc)
- pnpm `11.17.0` through Corepack
- Docker or a PostgreSQL 17-compatible server for authenticated development
- Rust `1.88.0`
- macOS: Xcode Command Line Tools
- Windows: Windows 10/11, WebView2, and Microsoft C++ Build Tools with the
  **Desktop development with C++** workload

## Install

```bash
nvm use
corepack enable
pnpm install
```

The frontend can run immediately with its local demo profile:

```bash
pnpm dev:web
```

Run the public Next.js landing page separately:

```bash
pnpm dev:site
```

The landing page runs at [localhost:3000](http://localhost:3000).

For the complete authenticated stack:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

The web app runs at [localhost:5173](http://localhost:5173), the API at
[localhost:8787](http://localhost:8787), and API health is available at
`/api/health`.

## Discord sign-in

Create a Discord application and set these values in `.env`:

```dotenv
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
```

Register this redirect URI:

```text
http://localhost:8787/api/auth/callback/discord
```

Use a production-quality Better Auth secret:

```bash
openssl rand -base64 32
```

## Desktop development

Save the public API origin used by desktop builds:

```bash
pnpm desktop:configure
```

Start a compatible API, then run Tauri with Vite HMR:

```bash
pnpm dev:api
pnpm desktop:dev
```

Use `pnpm dev:worker` instead when developing against the Cloudflare runtime.

### macOS

Build and install the native app:

```bash
pnpm desktop:install
```

Rebuild an existing installation without touching its app data:

```bash
pnpm desktop:update
```

Build a DMG without installing it:

```bash
pnpm desktop:build
```

Desktop commands accept `--api-url https://api.example.com`. Install commands
also accept `--install-dir ~/Applications`.

### Windows

Run the app in development:

```powershell
pnpm desktop:dev
```

Build the same per-user NSIS installer published on GitHub:

```powershell
$env:VITE_API_URL="https://YOUR_API_ORIGIN"
pnpm --filter @lifever/desktop tauri build --bundles nsis --ci
```

The setup executable is written under
`apps/desktop/src-tauri/target/release/bundle/nsis`.

## Validation

Run the repository-wide check before committing:

```bash
pnpm check
```

Useful focused commands:

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build the Node API and web frontend |
| `pnpm build:site` | Build the Next.js landing page |
| `pnpm build:worker` | Validate the Cloudflare Worker bundle |
| `pnpm db:generate` | Regenerate PostgreSQL and D1 Prisma clients |
| `pnpm db:migrate` | Create and apply a local PostgreSQL migration |
| `pnpm db:deploy:d1:local` | Apply migrations to local Wrangler D1 |
| `pnpm desktop:app` | Build and open the app bundle without installing |

## Landing page

The public site lives in `apps/site` and is deployed as the Vercel project
`badoszs-projects/lifever`.

Link a fresh checkout once:

```bash
pnpm dlx vercel@57.0.0 link \
  --cwd apps/site \
  --yes \
  --project lifever \
  --scope badoszs-projects
```

Deploy the validated source to production:

```bash
pnpm build:site
pnpm deploy:site
```

The production site is [www.lifever.app](https://www.lifever.app).

## Releases

Synchronize the next version, review the change, and push it:

```bash
pnpm release:version 0.2.0
git add .
git commit -m "chore(release): prepare v0.2.0"
git push
```

Exercise the universal macOS build without changing production:

```bash
pnpm release -- --dry-run
```

Publish:

```bash
pnpm release
```

The release command checks the workspace, builds and verifies an Intel and
Apple-silicon DMG, applies D1 migrations, deploys the Worker, tags the source,
and publishes the GitHub Release. Publishing triggers the
[`Windows release`](.github/workflows/windows-release.yml) workflow, which
builds the Windows x64 NSIS installer from the same tag. The release command
waits for that installer before updating `Casks/lifever.rb`.

Public releases require `APPLE_SIGNING_IDENTITY` plus one notarization method:

- `APPLE_API_ISSUER`, `APPLE_API_KEY`, and `APPLE_API_KEY_PATH`; or
- `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`.

`--allow-ad-hoc` exists for intentional unnotarized builds. It should not be the
normal public release path.

Windows releases are currently unsigned. Each installer is built on GitHub
Actions and published with a SHA-256 checksum beside it.
