<p align="center">
  <img src="assets/brand/logo.png" width="112" alt="Lifever logo">
</p>

<h1 align="center">Lifever</h1>

<p align="center">
  A calm home for the everyday parts of life.<br>
  Reminders, calendar, notes, projects, Formula 1, and AI usage—together on macOS, Windows, and the web.
</p>

<p align="center">
  <a href="https://www.lifever.app">Website</a>
  ·
  <a href="https://github.com/badosz0/lifever/releases/latest">Download for macOS</a>
  ·
  <a href="https://github.com/badosz0/lifever/releases/latest/download/Lifever-Windows-x64-setup.exe">Download for Windows</a>
  ·
  <a href="#homebrew">Install with Homebrew</a>
  ·
  <a href="SELF_HOSTING.md">Self-host</a>
</p>

![Lifever week calendar](docs/screenshots/calendar-week.jpg)

## One place, six focused apps

- **Reminders** — natural scheduling, categories, notes, priority, sounds, and Undo.
- **Calendar** — multiple calendars, Google sync, app-owned schedules, four views, drag creation, resizing, colors, and alerts.
- **Notes** — multiple categories, fast search, pinning, and polished Markdown rendering.
- **Kanban** — multiple projects, custom properties, labels, limits, search, and fluid drag and drop.
- **Formula 1** — race weekends, championship data, local session times, and live countdowns.
- **AI** — Codex limits, token history, model breakdowns, and daily usage at a glance.

AI and Formula 1 are opt-in. Every other app is ready on first launch.

| Home | AI usage |
| --- | --- |
| ![Lifever Home overview](docs/screenshots/home-overview.jpg) | ![Lifever AI usage dashboard](docs/screenshots/ai-usage.jpg) |

| Reminders | Kanban |
| --- | --- |
| ![Lifever reminders](docs/screenshots/reminders-today.jpg) | ![Lifever Kanban board](docs/screenshots/kanban-board.jpg) |

| Notes | Formula 1 |
| --- | --- |
| ![Lifever Markdown notes](docs/screenshots/notes-markdown.jpg) | ![Lifever Formula 1 weekend](docs/screenshots/formula-1.jpg) |

Lifever requires an account. Your reminders, calendars, notes, projects, and
preferences stay synced through the Lifever API on every device.

## Install

### macOS with Homebrew

```bash
brew tap badosz0/lifever https://github.com/badosz0/lifever
brew trust --cask badosz0/lifever/lifever
brew install lifever
```

Update later with:

```bash
brew update
brew upgrade lifever
```

### Windows

Download the latest
[Windows 10/11 x64 installer](https://github.com/badosz0/lifever/releases/latest/download/Lifever-Windows-x64-setup.exe).
The matching SHA-256 checksum is attached to every release.

## Develop locally

Requirements: Node `22.14.0` and pnpm `11.17.0`.

```bash
corepack enable
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:deploy:local
pnpm dev
```

Add a Discord OAuth client to `apps/api/.dev.vars`, then open
[localhost:5173](http://localhost:5173). See [BUILDING.md](BUILDING.md) for the
redirect URI and full setup.

## Built with

React 19 · TypeScript · Vite · Tailwind CSS · Tauri 2 · Rust · Hono · Better
Auth · Prisma · Cloudflare Workers · D1

## Documentation

- [Building and local development](BUILDING.md)
- [Self-hosting and deployment](SELF_HOSTING.md)
- [Contributing](CONTRIBUTING.md)
