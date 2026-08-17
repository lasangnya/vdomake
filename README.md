# VDOMake

Turn any website URL into a polished, animated video. Paste a URL → capture the
site with high-DPI screenshots → extract its theme → build an editable
storyboard → sync a voiceover → generate and export a video.

## Monorepo Layout

A [Bun](https://bun.sh) + [Turborepo](https://turborepo.com) monorepo:

```
vdomake/
├── apps/
│   └── web/            # Next.js app (UI + API routes + capture worker)
├── packages/
│   ├── config/         # shared tsconfig.base/bun/react
│   ├── logger/         # pino logger (Bun + Node compatible)
│   └── validators/     # shared Zod schemas (client + server)
├── package.json        # workspace root (bun + turbo)
├── turbo.json
└── docker-compose.yml  # Postgres + Redis for local dev
```

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- Docker (Postgres + Redis)
- FFmpeg (video encoding) — `brew install ffmpeg`

## Getting Started

```bash
bun install          # install all workspace deps
docker compose up -d # Postgres + Redis
bun run dev          # Next.js dev server → http://localhost:3000
bun run worker       # capture/queue worker (separate process)
```

The capture worker is the process that actually turns a URL into screenshots —
start it alongside the dev server for the capture pipeline to work.

## Scripts (run from root)

| Command | Description |
|---|---|
| `bun run dev` | Start Next.js dev server |
| `bun run build` | Build all packages + app |
| `bun run check` | lint + typecheck + format:check + test (all workspaces) |
| `bun run lint` | oxlint across workspaces |
| `bun run worker` | Start the capture worker |
| `bun run db:push` | Apply Drizzle schema to Postgres |
| `bun run test:e2e` | Playwright e2e suite |

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui (Base UI engine), Geist font
- **Data**: Drizzle ORM + Postgres, Zod shared schemas
- **API**: tRPC 11 (Next adapter) + TanStack React Query + REST route handlers
- **State**: Zustand (client), React Query (server cache)
- **Queues**: BullMQ + Redis
- **Capture**: Playwright (headless Chromium, high-DPI scroll capture)
- **Linting**: oxlint (via ultracite) + Prettier formatting + knip
- **Testing**: Vitest + Testing Library, Playwright e2e

## Design

`PRODUCT.md` and `DESIGN.md` define the VDOMake product truth and visual world
(zinc base + violet accent), maintained with the Impeccable design system.
