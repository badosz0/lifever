# Contributing to Lifever

Thanks for helping make Lifever calmer, clearer, and more dependable.

## Start here

1. Follow [BUILDING.md](BUILDING.md) to install dependencies and run the demo.
2. Create a focused branch from `main`.
3. Keep changes scoped to one feature or cleanup.
4. Run `pnpm check` before opening a pull request.

## Repository map

```text
apps/
  web/       Shared React product UI
  api/       Hono API, auth, services, and database adapters
  desktop/   Thin Tauri host for the web build
prisma/      PostgreSQL and D1 schemas and migrations
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

The local profile must remain useful without a server. Authenticated collections
must be scoped to the server session's user ID; clients never choose a user ID.

For synced features:

- update both PostgreSQL and D1 schemas when persistence changes;
- include committed migrations;
- keep optimistic UI behavior and rollback paths intact;
- do not store authenticated server data in local storage;
- verify behavior after sign-in, refresh, and on a second client.

See [SELF_HOSTING.md](SELF_HOSTING.md) for the two supported backend runtimes.

## Pull requests

A useful pull request includes:

- a concise description of the user-facing outcome;
- screenshots or a short recording for visual changes;
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

