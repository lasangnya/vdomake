# VDOMake

**Turn any website URL into a polished, animated video.**

Paste a URL → capture the site with high-DPI screenshots → extract its visual
theme → build an editable storyboard → sync a voiceover → generate and export a
production-ready video. What takes a motion designer 4–8 hours in After Effects,
VDOMake compresses to minutes — and because the output is generated code (Motion
Canvas), the result stays version-controllable and infinitely tweakable.

---

## Table of Contents

- [What this platform does](#what-this-platform-does)
- [The 5-phase pipeline](#the-5-phase-pipeline)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Starting the platform](#starting-the-platform)
- [Using the `vdo` CLI](#using-the-vdo-cli)
- [Workspace scripts](#workspace-scripts)
- [Project structure](#project-structure)
- [Design & docs](#design--docs)

---

## What this platform does

VDOMake is an AI-powered video studio for the web. Instead of screen-recording a
site and hand-animating it, VDOMake:

1. **Captures** a website in a headless browser — full-page, high-DPI (2×/3×)
   screenshots across the scroll, at any viewport (desktop/tablet/mobile).
2. **Understands** it — extracts the site's theme (color palette, typography,
   spacing rhythm, border radius, shadows, brand assets) into a structured
   manifest.
3. **Storyboards** it — an AI proposes an ordered scene sequence (transitions,
   durations, camera moves, text overlays) that you can reorder and refine.
4. **Syncs audio** — upload a voiceover; transcribe it and tag keyframes so
   scenes land on the narration.
5. **Generates + exports** — writes Motion Canvas code from the timed storyboard
   and renders production-ready MP4 (720p/1080p/4K), or lets you download the
   project to edit elsewhere.

You bring your own AI keys (OpenAI, Anthropic, Gemini, or local Ollama) and
choose which provider powers each task. Keys are encrypted at rest and never
leave your machine.

---

## The 5-phase pipeline

The user experience follows a five-phase pipeline, each phase producing an
artifact you review before moving on:

```
1. Capture  →  2. Storyboard  →  3. Voiceover & Keyframes  →  4. Code Generation  →  5. Timeline & Export
```

| Phase | Input | Output | Status |
|---|---|---|---|
| **1. Capture** | A URL (public or localhost) | High-DPI screenshots + theme manifest | ✅ Built |
| **2. Storyboard** | Screenshots + theme | Editable AI-proposed scene sequence | ⏳ Next |
| **3. Voiceover** | Storyboard + audio | Transcribed, keyframe-tagged timing map | ⛔ Planned |
| **4. Code Generation** | Timed storyboard | Motion Canvas project + preview render | ⛔ Planned |
| **5. Timeline & Export** | Video project | Production MP4 / project zip | ⛔ Planned |

---

## Tech stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **UI** | Tailwind CSS v4, shadcn/ui (Base UI engine), Geist font, lucide icons |
| **Data** | Drizzle ORM + Postgres, Zod shared schemas |
| **API** | tRPC 11 (Next adapter) + TanStack React Query + REST route handlers |
| **State** | Zustand (client), React Query (server cache) |
| **Queues** | BullMQ + Redis |
| **Capture** | Playwright (headless Chromium, high-DPI scroll capture) |
| **AI** | Provider abstraction (OpenAI, Anthropic, Gemini, local Ollama) |
| **Linting** | oxlint (via ultracite) + Prettier + knip |
| **Testing** | Vitest + Testing Library, Playwright e2e |
| **Tooling** | Bun + Turborepo monorepo |

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- [Docker](https://www.docker.com) — for Postgres + Redis
- [FFmpeg](https://ffmpeg.org) — video encoding: `brew install ffmpeg`
- Playwright browsers — downloaded by the first `bun run test:e2e`

---

## Local setup

```bash
# 1. Clone and install workspace dependencies
bun install

# 2. Configure environment (once)
cp apps/web/.env.example apps/web/.env.local
#    then generate a secret and set it:
#    openssl rand -hex 32  →  ENCRYPTION_SECRET

# 3. Start Postgres + Redis
docker compose up -d

# 4. Apply the database schema
bun run db:push

# 5. (Optional) make `vdo` a standalone command you can run from anywhere
cd apps/cli && bun link
```

---

## Starting the platform

The **quickest way** is the `vdo` developer CLI (rooted at `apps/cli`):

```bash
vdo up          # 1. Postgres + Redis
vdo dev         # 2. Next.js dev server → http://localhost:3000
vdo worker      # 3. capture worker (URL → screenshots)
```

> **`vdo` is available two ways.** After `bun link` in `apps/cli` (run once), it
> works as a **standalone command** from anywhere (`vdo up`). Otherwise prefix it
> with `bun run`: `bun run vdo up`. Both are equivalent — the CLI lives in
> `apps/cli` and runs via Bun.

Or run the underlying commands directly:

```bash
docker compose up -d    # Postgres + Redis
bun run dev             # Next.js dev server → http://localhost:3000
bun run worker          # capture worker (separate terminal)
```

> **The capture worker is required** for the URL → screenshots pipeline. It runs
> as a separate process that consumes capture jobs from Redis. Leave one terminal
> running it while you use the app.

Once running, open **http://localhost:3000**:

- **`/`** — landing page (paste a URL)
- **`/projects`** — your projects
- **`/projects/new`** — paste a URL → watch live capture progress → review
  screenshots + theme manifest
- **`/settings`** — add your own AI provider keys and configure task routing

---

## Using the `vdo` CLI

`vdo` is a developer workflow CLI (mirroring whereismyuni's `wimu`) that wraps
the monorepo's day-to-day commands:

```
USAGE vdo up|down|dev|worker|build|check|db
```

| Command | What it does |
|---|---|
| `vdo up` | Start Postgres + Redis via docker compose |
| `vdo down` | Stop Postgres + Redis |
| `vdo dev` | Start the Next.js dev server (`vdo dev --worker` also starts the worker) |
| `vdo worker` | Start the capture worker (URL → screenshots) |
| `vdo build` | Build all packages + the Next.js app |
| `vdo check` | Full quality gate (lint + typecheck + format + test) |
| `vdo db push` | Apply the Drizzle schema to Postgres |
| `vdo db generate` | Generate migration SQL from the schema |
| `vdo db studio` | Open Drizzle Studio (interactive DB browser) |
| `vdo db reset` | Recreate Postgres + Redis and re-apply the schema |

Examples:

```bash
vdo                 # list commands (or: bun run vdo)
vdo db --help       # db subcommands
vdo dev --worker    # dev server + capture worker in one
vdo check           # run all checks before pushing
```

> If `vdo` isn't found, run `bun run vdo` instead — or install the standalone
> binary once with `cd apps/cli && bun link`.

---

## Workspace scripts

Run from the repo root:

| Command | Description |
|---|---|
| `bun run dev` | Start Next.js dev server |
| `bun run worker` | Start the capture worker |
| `bun run build` | Build all packages + app |
| `bun run check` | lint + typecheck + format + test (all workspaces) |
| `bun run lint` | oxlint across workspaces |
| `bun run test` | Unit/integration tests (Vitest) |
| `bun run test:e2e` | Playwright e2e suite |
| `bun run db:push` | Apply Drizzle schema to Postgres |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:generate` | Generate migrations |
| `bun run vdo …` | The `vdo` developer CLI (see above) |

---

## Project structure

```
vdomake/
├── apps/
│   ├── web/                       # Next.js app + API + capture worker
│   │   ├── src/app/               #   App Router (pages, API routes)
│   │   ├── src/components/        #   shadcn/ui + feature components
│   │   ├── src/lib/               #   providers, capture, db, queue, trpc
│   │   ├── src/stores/            #   Zustand stores
│   │   └── e2e/                   #   Playwright tests
│   └── cli/                       # `vdo` developer CLI
├── packages/
│   ├── config/                    # shared tsconfig.base/bun/react
│   ├── logger/                    # pino logger (Bun + Node)
│   └── validators/                # shared Zod schemas
├── package.json                   # workspace root (bun + turbo)
├── turbo.json
└── docker-compose.yml             # Postgres + Redis
```

---

## Design & docs

- **`PRODUCT.md`** — product truth, personas, positioning, success metrics.
- **`DESIGN.md`** — the VDOMake visual world: zinc base + violet accent, Geist
  type, shadcn/Base UI components. Maintained with the Impeccable design system.
- **`implementation_plan.md`** — the 5-phase build plan and status.
