# Contributing to Lifever

Thanks for helping make Lifever calmer, clearer, and more dependable.

## Start here

1. Follow [BUILDING.md](BUILDING.md) to install dependencies and run Lifever.
2. Create a focused branch from `main`.
3. Keep changes scoped to one feature or cleanup.
4. Run `pnpm check` before opening a pull request.

## Repository map

```text
apps/
  web/       Shared React product UI
  api/       Cloudflare Worker API, auth, and services
  desktop/   Thin Tauri host for the web build
  site/      Public Next.js landing page
.github/     Cross-platform release automation
prisma/      D1 schema and migrations
scripts/     Desktop, versioning, deployment, and release tooling
```

Feature behavior belongs under `apps/web/src/features`. Reusable primitives
belong under `apps/web/src/components/ui`; cross-feature application shell
pieces belong under `apps/web/src/components/app-shell`.

## Product principles

- Prefer calm defaults over large configuration surfaces.
- Keep content aligned to the start and cards opaque.
- Use semantic theme tokens instead of raw light/dark colors.
- Keep frequent keyboard actions instant.
- Use motion for feedback or spatial explanation, not decoration.
- Respect reduced motion, reduced transparency, high contrast, keyboard
  navigation, and touch targets.
- Make destructive reminder and calendar actions recoverable with Undo.

## Data and sync

Lifever requires authentication. Collections must be scoped to the server
session's user ID; clients never choose a user ID.

For synced features:

- update the canonical D1 Prisma schema when persistence changes;
- include a committed D1 migration;
- keep optimistic UI behavior and rollback paths intact;
- do not store authenticated server data in local storage;
- verify behavior after sign-in, refresh, and on a second client.

See [SELF_HOSTING.md](SELF_HOSTING.md) for the supported Cloudflare deployment.

## Pull requests

A useful pull request includes:

- a concise description of the user-facing outcome;
- screenshots or a short recording for visual changes;
- platform notes when desktop behavior differs between macOS and Windows;
- migration and deployment notes when data changes;
- the checks performed;
- any known follow-up that is intentionally out of scope.

Use conventional, outcome-focused commit messages such as:

```text
feat(calendar): add event alerts
fix(kanban): prevent date popover clipping
refactor(notes): share collection search controls
```

Avoid unrelated formatting or broad cleanup in feature commits.
