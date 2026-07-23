# Lifever

Lifever is a calm, modular home for the everyday parts of life. It currently ships polished Reminders and Calendar experiences for the web and macOS, with a backend designed to grow into more life modules.

## Stack

- TypeScript, React 19, Vite 8
- Tailwind CSS 4 and local shadcn/ui components
- Hono API with Better Auth 1.6
- Discord OAuth
- Prisma 7 with PostgreSQL
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

Reminders and Calendar work immediately as a local profile and store guest data on the device. After Discord sign-in, the same interaction layer reads and writes authenticated PostgreSQL collections through the API.

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

## macOS app

Run the API in one terminal and the Tauri app in another:

```bash
pnpm dev:api
pnpm desktop:dev
```

Build the macOS application and DMG with:

```bash
pnpm desktop:build
```

The release configuration embeds local, deterministic frontend assets and grants no filesystem, shell, or process permissions. Distribution builds still need an Apple signing identity and notarization credentials.

## Useful commands

```bash
pnpm dev             # web + API
pnpm check           # Prisma generation + all TypeScript/Tauri checks
pnpm build           # production API and web builds
pnpm db:generate     # regenerate the Prisma client
pnpm db:migrate      # create/apply a local migration
pnpm db:deploy       # apply committed migrations in production
pnpm db:studio       # inspect PostgreSQL data
pnpm desktop:dev     # native shell with Vite HMR
pnpm desktop:build   # macOS app + DMG
```

## Product conventions

- Feature behavior lives under `src/features`; shared primitives live under `src/components/ui`.
- Components depend on semantic theme tokens, not raw light/dark colors.
- Frequent keyboard actions stay instant. Motion is reserved for state explanation and direct feedback.
- Destructive reminder and calendar actions are recoverable with Undo.
- Reduced motion, reduced transparency, high contrast, keyboard navigation, and touch targets are first-class constraints.
