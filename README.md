<p align="center">
  <img src="assets/brand/logo.png" width="112" alt="Lifever logo">
</p>

<h1 align="center">Lifever</h1>

<p align="center">
  A calm home for the everyday parts of life.<br>
  Reminders, calendar, notes, projects, and Formula 1—together on the web and macOS.
</p>

<p align="center">
  <a href="https://lifever.vercel.app">Website</a>
  ·
  <a href="https://github.com/badosz0/lifever/releases/latest">Download for macOS</a>
  ·
  <a href="#homebrew">Install with Homebrew</a>
  ·
  <a href="SELF_HOSTING.md">Self-host</a>
</p>

![Lifever week calendar](docs/screenshots/calendar-week.jpg)

## One place, five focused apps

- **Reminders** — natural scheduling, categories, notes, priority, sounds, and Undo.
- **Calendar** — day, week, month, and year views with drag creation, resizing, colors, and alerts.
- **Notes** — multiple categories, fast search, pinning, and polished Markdown rendering.
- **Kanban** — multiple projects, custom properties, labels, limits, search, and fluid drag and drop.
- **Formula 1** — race weekends, championship data, local session times, and live countdowns.

| Reminders | Kanban |
| --- | --- |
| ![Demo reminders](docs/screenshots/reminders-today.jpg) | ![Demo Kanban board](docs/screenshots/kanban-board.jpg) |

| Notes | Formula 1 |
| --- | --- |
| ![Demo Markdown notes](docs/screenshots/notes-markdown.jpg) | ![Demo Formula 1 weekend](docs/screenshots/formula-1.jpg) |

Lifever starts with a local demo profile, so the interface is useful before any
account or server exists. Discord sign-in enables authenticated sync across
devices.

## Homebrew

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

## Run the demo

Requirements: Node `22.14.0` and pnpm `11.17.0`.

```bash
corepack enable
pnpm install
pnpm dev:web
```

Open [localhost:5173](http://localhost:5173). The local profile is automatically
seeded with demo reminders, events, notes, and projects.

## Built with

React 19 · TypeScript · Vite · Tailwind CSS · Tauri 2 · Hono · Better Auth ·
Prisma · PostgreSQL · Cloudflare Workers and D1

## Documentation

- [Building and local development](BUILDING.md)
- [Self-hosting and deployment](SELF_HOSTING.md)
- [Contributing](CONTRIBUTING.md)
