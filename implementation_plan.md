# VDOMake — Phase-by-Phase Implementation Plan

> **Goal:** Build an AI-powered platform that turns any website URL into a polished animated video, using Next.js + shadcn/ui for the frontend and Motion Canvas for video generation.

---

## Tech Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, React Server Components |
| **UI Components** | shadcn/ui (Tailwind CSS v4) | Accessible, composable, theme-able |
| **Design Quality** | [Impeccable](https://github.com/pbakaus/impeccable) | AI design skill — anti-pattern detection, design commands |
| **Web Capture** | Playwright | Headless Chromium, multi-viewport, SPA support |
| **AI Provider Router** | Custom abstraction layer | Unified interface — user brings their own API keys |
| **AI / Vision** | OpenAI GPT-4o, Anthropic Claude, Gemini 2.5 Pro | User’s choice per task — vision, storyboard, code review |
| **Audio Processing** | OpenAI Whisper (API or local whisper.cpp) | Speech transcription + timestamp extraction |
| **Video Generation** | Motion Canvas | TypeScript-based programmatic video, open-source |
| **Database** | PostgreSQL + Drizzle ORM | Projects, storyboards, keyframes, encrypted API keys |
| **Queue** | BullMQ + Redis | Async capture, render, and export jobs |
| **Storage** | S3-compatible (or local `./uploads`) | Screenshots, audio, rendered videos |
| **State Management** | Zustand | Lightweight, works well with React/Next.js |

---

## Phase 0 — Project Scaffolding & Tooling

**Duration:** ~1 week
**Goal:** Set up the monorepo, install all tooling, and get a shell app running with shadcn/ui.

### 0.1 Scaffold Next.js App

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 0.2 Install shadcn/ui

```bash
npx shadcn@latest init
```

**Initial shadcn components to install:**

```bash
npx shadcn@latest add button card input label tabs dialog \
  dropdown-menu separator skeleton slider progress \
  toast tooltip scroll-area sheet badge command \
  avatar alert popover select textarea switch
```

### 0.3 Install Impeccable (✅ Done)

Already installed into `.gemini/skills/impeccable` and `.agents/skills/impeccable`.

After project scaffolding, run `/impeccable init` to generate `PRODUCT.md` and `DESIGN.md` for the VDOMake brand.

### 0.4 Install Core Dependencies

```bash
# Web capture
npm install playwright

# AI — multi-provider support (user brings their own keys)
npm install openai @google/generative-ai @anthropic-ai/sdk ai
# `ai` = Vercel AI SDK — provides a unified interface across providers

# Audio
npm install wavesurfer.js

# Video generation & encoding
npm install @motion-canvas/core @motion-canvas/2d @motion-canvas/vite-plugin
npm install fluent-ffmpeg
npm install -D @types/fluent-ffmpeg
# NOTE: FFmpeg binary required on system — see section 0.5a

# Database & Queue
npm install drizzle-orm postgres bullmq ioredis
npm install -D drizzle-kit

# State management
npm install zustand

# Drag-and-drop (storyboard reordering)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Code editor (generated code preview)
npm install @monaco-editor/react

# Utilities
npm install nanoid zod sharp mime-types archiver
npm install -D @types/archiver

# Logging
npm install pino pino-pretty

# Encryption (for API key storage)
npm install iron-session

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom @playwright/test msw happy-dom

# Linting & Formatting
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks prettier eslint-config-prettier

# Pre-commit hooks
npm install -D husky lint-staged
npx husky init
```

### 0.5 Project Structure

```
vdomake/
├── .agents/skills/impeccable/      # Impeccable design skill
├── .gemini/skills/impeccable/      # Impeccable (Gemini)
├── .husky/                         # Pre-commit hooks
│   └── pre-commit                  # Runs lint-staged
├── docker-compose.yml              # PostgreSQL + Redis for local dev
├── .env.example                    # Environment variable template
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout, fonts, theme
│   │   ├── error.tsx               # Global error boundary
│   │   ├── page.tsx                # Landing / dashboard
│   │   ├── settings/               # API key management
│   │   │   └── page.tsx            # Provider settings page
│   │   ├── projects/
│   │   │   ├── page.tsx            # Projects list
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Project workspace (redirects to capture)
│   │   │       ├── error.tsx       # Project-level error boundary
│   │   │       ├── capture/page.tsx
│   │   │       ├── storyboard/page.tsx
│   │   │       ├── audio/page.tsx
│   │   │       ├── generate/page.tsx
│   │   │       └── timeline/page.tsx
│   │   └── api/
│   │       ├── providers/route.ts  # CRUD for API keys
│   │       ├── capture/route.ts
│   │       ├── capture/progress/route.ts  # SSE endpoint for capture progress
│   │       ├── analyze/route.ts
│   │       ├── storyboard/route.ts
│   │       ├── audio/route.ts
│   │       ├── generate/route.ts
│   │       ├── export/route.ts
│   │       └── export/progress/route.ts   # SSE endpoint for export progress
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── settings/               # Provider settings components
│   │   ├── capture/                # Phase 1 components
│   │   ├── storyboard/             # Phase 2 components
│   │   ├── audio/                  # Phase 3 components
│   │   ├── timeline/               # Phase 5 components
│   │   └── shared/                 # Layout, nav, phase-stepper, error boundaries
│   ├── lib/
│   │   ├── providers/              # AI provider abstraction layer
│   │   ├── capture/                # Playwright capture engine
│   │   ├── ai/                     # AI agent (theme analysis, storyboard gen)
│   │   ├── audio/                  # Whisper integration, waveform utils
│   │   ├── codegen/                # Motion Canvas code generation
│   │   ├── render/                 # Headless Motion Canvas rendering
│   │   ├── db/                     # Drizzle schema, connection
│   │   ├── queue/                  # BullMQ job definitions
│   │   ├── validators/             # Zod validation schemas
│   │   │   ├── url-input.schema.ts
│   │   │   ├── theme-manifest.schema.ts
│   │   │   ├── scene.schema.ts
│   │   │   ├── keyframe.schema.ts
│   │   │   ├── export-config.schema.ts
│   │   │   └── provider.schema.ts
│   │   ├── utils/
│   │   │   ├── logger.ts           # Pino logger instance
│   │   │   ├── sse.ts              # Server-Sent Events helpers
│   │   │   ├── api-error.ts        # Standardized API error responses
│   │   │   └── helpers.ts          # General utilities (cn, etc.)
│   │   └── hooks/
│   │       ├── use-event-stream.ts  # React hook for consuming SSE
│   │       └── use-debounce.ts
│   ├── stores/                     # Zustand stores
│   │   ├── project-store.ts
│   │   ├── provider-store.ts       # Active provider state
│   │   ├── storyboard-store.ts
│   │   ├── audio-store.ts
│   │   └── timeline-store.ts
│   └── types/                      # TypeScript types
│       ├── provider.ts             # Provider types & interfaces
│       ├── project.ts
│       ├── scene.ts
│       ├── theme.ts
│       ├── keyframe.ts
│       └── api.ts                  # API request/response types, error shapes
├── motion-canvas/                  # Motion Canvas project (generated)
│   ├── src/
│   │   └── scenes/                 # Generated scene files
│   └── vite.config.ts
├── uploads/                        # Local file storage
├── PRODUCT.md                      # Generated by /impeccable init
├── DESIGN.md                       # Generated by /impeccable init
└── package.json
```

### 0.5a Docker & Environment Setup

#### [NEW] `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: vdomake
      POSTGRES_USER: vdomake
      POSTGRES_PASSWORD: vdomake_dev
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

#### [NEW] `.env.example`
```env
# Database
DATABASE_URL=postgres://vdomake:vdomake_dev@localhost:5432/vdomake

# Redis
REDIS_URL=redis://localhost:6379

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_SECRET=

# Storage (leave empty for local ./uploads)
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### System Requirements
- **FFmpeg** must be installed on the system for video encoding:
  ```bash
  # macOS
  brew install ffmpeg
  # Ubuntu/Debian
  sudo apt install ffmpeg
  # Or use Docker: ffmpeg is pre-installed in the render container
  ```
- **Docker & Docker Compose** for running PostgreSQL and Redis locally

Start local services:
```bash
cp .env.example .env.local   # Fill in ENCRYPTION_SECRET
docker compose up -d          # Start Postgres + Redis
npx drizzle-kit push          # Apply DB schema
npm run dev                   # Start Next.js
```

### 0.6 AI Provider Abstraction Layer

Build the **provider system** that all AI-powered features will use:

#### [NEW] `src/lib/providers/provider-registry.ts`
- Defines the `AIProvider` interface:
  ```typescript
  interface AIProvider {
    id: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
    name: string;
    capabilities: ('vision' | 'text' | 'transcription' | 'embedding')[];
    validateKey: (key: string) => Promise<boolean>;
    createClient: (key: string) => ProviderClient;
  }
  ```
- Registry of all supported providers with their capabilities
- `getProvider(id)` — returns provider implementation
- `getProvidersForCapability(cap)` — lists providers that support a given task

#### [NEW] `src/lib/providers/clients/openai-client.ts`
- Wraps `openai` SDK with VDOMake’s unified interface
- Supports: GPT-4o (vision), GPT-4o-mini (text), Whisper (transcription)

#### [NEW] `src/lib/providers/clients/anthropic-client.ts`
- Wraps `@anthropic-ai/sdk`
- Supports: Claude 4 / Sonnet (vision + text)

#### [NEW] `src/lib/providers/clients/gemini-client.ts`
- Wraps `@google/generative-ai`
- Supports: Gemini 2.5 Pro (vision + text), Gemini 2.5 Flash (text)

#### [NEW] `src/lib/providers/clients/ollama-client.ts`
- Connects to local Ollama/LM Studio via OpenAI-compatible API
- Auto-detects available models

#### [NEW] `src/lib/providers/provider-router.ts`
- Routes AI requests to the user’s chosen provider per task type
- Implements fallback chain: if primary provider fails, tries next configured provider
- Handles rate limits and retries

#### [NEW] `src/lib/providers/key-manager.ts`
- Encrypts API keys before database storage (AES-256-GCM)
- Decrypts keys only when needed for API calls
- Never logs or exposes keys in responses

### 0.7 Settings Page UI (`src/components/settings/`)

**shadcn components used:** `Card`, `Input`, `Button`, `Label`, `Badge`, `Alert`, `Tabs`, `Select`, `Switch`, `Separator`, `Dialog`, `Toast`

| Component | Description |
|---|---|
| `ProviderCard` | Card per provider (OpenAI, Anthropic, Gemini, Local) with logo, status badge, API key input |
| `ApiKeyInput` | Masked input with show/hide toggle, paste button, validation indicator (green checkmark / red X) |
| `ProviderStatus` | Badge showing: `Connected` / `Invalid Key` / `Not Configured` / `Rate Limited` |
| `TaskRoutingTable` | Table mapping each AI task (Vision Analysis, Storyboard Gen, Transcription, Auto-Sync, Code Review) to a provider dropdown |
| `FallbackChainEditor` | Drag-and-drop ordering of fallback providers per task |
| `UsageDashboard` | Charts showing token usage and estimated cost per provider per project |
| `ModelSelector` | Dropdown to pick specific model within a provider (e.g., GPT-4o vs GPT-4o-mini) |

### 0.8 Database Schema — Provider Keys

```typescript
// src/lib/db/schema.ts
provider_keys: {
  id, providerId ('openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom'),
  encryptedKey, // AES-256-GCM encrypted
  keyHint,      // last 4 characters for display (e.g., "...a3Bx")
  isValid,      // last validation result
  lastValidatedAt,
  createdAt, updatedAt
}

task_routing: {
  id, taskType ('vision' | 'storyboard' | 'transcription' | 'auto_sync' | 'code_review'),
  primaryProviderId, primaryModel,
  fallbackProviderId, fallbackModel
}

usage_logs: {
  id, projectId, providerId, taskType,
  tokensIn, tokensOut, estimatedCost,
  createdAt
}
```

### 0.9 Initial shadcn UI Shell

Build the **app shell** with these shared components:

| Component | shadcn Parts | Purpose |
|---|---|---|
| `PhaseStepper` | `Badge`, `Separator`, custom | Shows 5 phases, current phase highlighted |
| `ProjectLayout` | `Sheet`, `ScrollArea` | Sidebar + main content area |
| `TopNav` | `Button`, `Avatar`, `DropdownMenu` | App header with project name, settings gear, user menu |
| `EmptyState` | `Card`, `Button` | Shown when no projects exist |
| `ProviderGate` | `Alert`, `Button` | Shown when no API keys are configured — prompts user to settings |

### 0.10 Linting, Testing & Quality

Set up the full quality pipeline in Phase 0 so every subsequent phase has guardrails from day one.

#### Linting

##### [NEW] `eslint.config.mjs`
- **ESLint flat config** with TypeScript strict rules
- `eslint-plugin-react` + `eslint-plugin-react-hooks` for React best practices
- `eslint-config-prettier` to avoid conflicts with formatter
- Custom rules:
  - `no-console` → warn (force proper logging)
  - `@typescript-eslint/no-explicit-any` → error
  - `@typescript-eslint/strict-boolean-expressions` → error
  - `react-hooks/exhaustive-deps` → error

##### [NEW] `.prettierrc`
- Consistent formatting: `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`

##### Impeccable Design Lint
- Already installed. The `npx impeccable` CLI runs **59 deterministic anti-pattern rules** against the built HTML/CSS — no LLM needed.
- Add to npm scripts: `"lint:design": "npx impeccable detect"`
- Catches: gray text on colored backgrounds, Inter/Arial overuse, bounce easing, cards-in-cards, low-contrast text, and 54 more.

#### Testing

##### [NEW] `vitest.config.ts`
- **Vitest** as the test runner (fast, Vite-native, ESM-first)
- `jsdom` environment for component tests
- Path aliases matching `tsconfig.json` (`@/*`)
- Coverage thresholds: `branches: 70`, `functions: 75`, `lines: 75`

##### [NEW] `playwright.config.ts`
- **Playwright E2E tests** (reuses the Playwright already installed for capture)
- Base URL: `http://localhost:3000`
- Projects: Chromium, Firefox, WebKit
- Screenshot on failure, trace on retry

##### Test Structure
```
src/
├── __tests__/                       # Unit & integration tests
│   ├── lib/
│   │   ├── providers/               # Provider abstraction tests
│   │   ├── capture/                 # Capture engine tests
│   │   ├── ai/                      # AI agent tests (mocked)
│   │   ├── audio/                   # Transcription tests
│   │   ├── codegen/                 # Code generator tests
│   │   └── timeline/                # Timeline state tests
│   └── components/
│       ├── settings/                # Provider settings tests
│       ├── capture/                 # Capture UI tests
│       ├── storyboard/              # Storyboard editor tests
│       ├── audio/                   # Audio/keyframe UI tests
│       └── timeline/                # Timeline editor tests
e2e/
├── capture-flow.spec.ts             # Full capture workflow
├── storyboard-flow.spec.ts          # Storyboard creation + editing
├── audio-sync-flow.spec.ts          # Upload + keyframe tagging
├── export-flow.spec.ts              # End-to-end render + export
└── settings.spec.ts                 # API key management
```

##### npm Scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint src/ --max-warnings 0",
  "lint:fix": "eslint src/ --fix",
  "lint:design": "npx impeccable detect",
  "format": "prettier --write src/",
  "format:check": "prettier --check src/",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:generate": "drizzle-kit generate",
  "check": "npm run lint && npm run typecheck && npm run format:check && npm run test && npm run lint:design",
  "prepare": "husky"
}
```

##### lint-staged config (in `package.json`)
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "src/**/*.{css,json,md}": ["prettier --write"]
  }
}
```

> [!TIP]
> The `check` script runs lint + typecheck + format + tests + design audit in one command. `husky` + `lint-staged` runs lint/format automatically on every commit.

### 0.11 Infrastructure Utilities

Cross-cutting infrastructure that multiple phases depend on — build it once in Phase 0.

#### Error Handling & Logging

##### [NEW] `src/lib/utils/logger.ts`
- **Pino** logger with `pino-pretty` for dev, JSON for production
- Log levels: `debug`, `info`, `warn`, `error`
- Structured context: `{ projectId, phase, jobId }` attached to all logs

##### [NEW] `src/lib/utils/api-error.ts`
- Standardized API error response shape:
  ```typescript
  interface ApiError {
    error: true;
    code: 'VALIDATION_ERROR' | 'PROVIDER_ERROR' | 'CAPTURE_FAILED' | 'RENDER_FAILED' | ...;
    message: string;
    details?: Record<string, unknown>;
  }
  ```
- Helper: `throwApiError(code, message, status)` — throws a `NextResponse` with correct status
- All API routes use this — no raw `500` responses

##### [NEW] `src/app/error.tsx` + `src/app/projects/[id]/error.tsx`
- **React Error Boundaries** at root and project level
- Shows user-friendly error message with "Retry" button
- Logs error to server via `/api/log` endpoint

#### Real-Time Progress (SSE)

##### [NEW] `src/lib/utils/sse.ts`
- Server-side helper to create SSE `ReadableStream` responses:
  ```typescript
  function createSSEStream(): { stream: ReadableStream; send: (event: string, data: any) => void; close: () => void }
  ```
- Used by: capture progress, render progress, export progress routes

##### [NEW] `src/lib/hooks/use-event-stream.ts`
- React hook for consuming SSE streams:
  ```typescript
  function useEventStream<T>(url: string): { data: T | null; status: 'connecting' | 'open' | 'closed' | 'error'; close: () => void }
  ```
- Auto-reconnects on disconnect, supports cleanup on unmount
- Used by: `CaptureProgress`, `RenderProgress`, `ExportProgress` components

#### Zod Validation Schemas

##### [NEW] `src/lib/validators/`

| Schema File | Validates | Used By |
|---|---|---|
| `url-input.schema.ts` | URL format, localhost detection, viewport config | Capture API route |
| `theme-manifest.schema.ts` | Extracted theme structure (colors, fonts, spacing) | Theme extractor output |
| `scene.schema.ts` | Scene object shape, transition types, camera config | Storyboard API |
| `keyframe.schema.ts` | Keyframe timing, scene-audio sync map | Audio API |
| `export-config.schema.ts` | Resolution, format, frame rate, batch options | Export API |
| `provider.schema.ts` | Provider ID, API key format, task routing config | Provider API |

- Every API route validates input with Zod before processing
- Schemas are shared between frontend (form validation) and backend (API validation)
- Zod `.parse()` errors are caught and returned as `ApiError` with `code: 'VALIDATION_ERROR'`

### Deliverables
- [x] Next.js app running on `localhost:3000`
- [x] shadcn/ui initialized with theme
- [x] Impeccable skill installed
- [ ] Docker Compose with Postgres + Redis running
- [ ] `.env.example` + `.env.local` configured
- [ ] FFmpeg verified on system
- [ ] Provider abstraction layer with OpenAI, Anthropic, Gemini, and local support
- [ ] Settings page with API key management UI
- [ ] App shell with phase stepper navigation
- [ ] Landing page / dashboard
- [ ] Database schema + migrations (including provider keys)
- [ ] ESLint + Prettier + Husky pre-commit hooks configured
- [ ] Pino logger + API error helpers + error boundaries
- [ ] SSE utilities + `useEventStream` hook
- [ ] Zod validation schemas for all API routes
- [ ] Vitest + Playwright configured with initial smoke tests
- [ ] `npm run check` passes cleanly

---

## Phase 1 — Web Capture Engine

**Duration:** ~2 weeks
**Goal:** User enters a URL → system captures high-DPI screenshots → extracts theme manifest.

### 1.1 Capture Service (`src/lib/capture/`)

#### [NEW] `src/lib/capture/capture-engine.ts`
- Launches headless Playwright browser
- Navigates to URL, waits for network idle
- **Smart scroll capture:** scrolls page in viewport-height increments, captures each frame
- Captures at 2x DPI for crisp output
- Detects and captures key interactive states (hover on nav items, open dropdowns)
- Returns array of `CapturedFrame` objects with metadata (scroll position, viewport, timestamp)
- **Authenticated capture (post-MVP):** accepts optional `cookies[]` or `localStorage` entries for capturing sites behind login. Playwright injects these via `context.addCookies()` before navigation.
- **SPA route detection (post-MVP):** parses `<a>` tags, `next/link`, `react-router` patterns to discover internal routes. Captures each route as a separate scene group.

#### [NEW] `src/lib/capture/theme-extractor.ts`
- Injects JS into the page to extract computed styles
- Extracts: color palette, fonts, border-radii, shadows, spacing rhythm
- Extracts brand assets: logo (from `<header>`, favicon), OG images
- Outputs structured `ThemeManifest` (JSON), validated against `theme-manifest.schema.ts`

#### [NEW] `src/app/api/capture/route.ts`
- Accepts `{ url: string, viewports?: string[], cookies?: CookieParam[] }` — validated with `url-input.schema.ts`
- Validates URL (supports localhost and public)
- Enqueues capture job via BullMQ
- Returns job ID + SSE endpoint URL for real-time progress (`/api/capture/progress?jobId=...`)

#### [NEW] `src/app/api/capture/progress/route.ts`
- SSE endpoint streaming capture progress events: `connecting`, `scrolling`, `capturing`, `analyzing`, `complete`
- Uses `createSSEStream()` from `src/lib/utils/sse.ts`

### 1.2 Capture UI (`src/components/capture/`)

**shadcn components used:** `Input`, `Button`, `Card`, `Progress`, `Skeleton`, `Badge`, `Select`, `Alert`

| Component | Description |
|---|---|
| `UrlInput` | URL input with validation, localhost toggle, viewport selector |
| `CaptureProgress` | Real-time progress bar with status messages (connecting → scrolling → capturing → analyzing) |
| `ScreenshotGrid` | Grid of captured screenshots, each as a `Card` with thumbnail + metadata badge |
| `ThemePreview` | Shows extracted colors (swatches), fonts (specimens), spacing |
| `CaptureReview` | Full review page: grid on left, theme manifest on right |

### 1.3 Database Schema

```typescript
// src/lib/db/schema.ts
projects: {
  id, name, url, status, themeManifest (JSON),
  createdAt, updatedAt
}

captures: {
  id, projectId, screenshotUrl, scrollPosition,
  viewport, order, metadata (JSON)
}
```

### Verification
- [ ] Enter any public URL → see screenshots captured
- [ ] Enter `localhost:3000` → captures work
- [ ] Theme manifest correctly identifies colors, fonts
- [ ] Screenshots are 2x DPI, sharp at 1080p
- [ ] Progress UI updates in real-time

### Tests (Phase 1)

| Test File | Type | What It Covers |
|---|---|---|
| `__tests__/lib/capture/capture-engine.test.ts` | Unit | URL validation, viewport config, scroll position calculation |
| `__tests__/lib/capture/theme-extractor.test.ts` | Unit | Color extraction, font detection, theme manifest shape (Zod schema) |
| `__tests__/components/capture/url-input.test.tsx` | Component | Input validation, localhost toggle, submit behavior |
| `__tests__/components/capture/screenshot-grid.test.tsx` | Component | Renders captured frames, empty state, loading skeletons |
| `e2e/capture-flow.spec.ts` | E2E | Enter URL → progress → screenshots displayed → theme preview shown |

---

## Phase 2 — AI Storyboard Editor

**Duration:** ~3 weeks
**Goal:** AI generates an editable storyboard from captured screenshots + theme. User can reorder, edit, and refine scenes.

### 2.1 AI Storyboard Generator (`src/lib/ai/`)

#### [NEW] `src/lib/ai/storyboard-agent.ts`
- Takes captured screenshots + theme manifest as input
- Sends to Vision LLM (Gemini/GPT-4o) with structured prompt:
  - "Analyze these website screenshots and create a video storyboard"
  - Include scene ordering, suggested transitions, text overlays, camera movements
- Returns structured `Storyboard` (array of `Scene` objects)

#### [NEW] `src/lib/ai/scene-enhancer.ts`
- Optional: generates enhanced frames (device mockups, gradient backgrounds)
- Uses theme manifest colors for procedural elements
- Can generate callout/annotation overlays

#### [NEW] `src/types/scene.ts`
```typescript
interface Scene {
  id: string;
  order: number;
  screenshotId: string;
  title: string;
  description: string;
  duration: number; // seconds
  transition: {
    type: 'fade' | 'slide' | 'zoom' | 'morph' | 'wipe' | 'dissolve';
    duration: number;
    easing: 'smooth' | 'spring' | 'linear';
  };
  camera: {
    type: 'static' | 'pan' | 'zoom-to' | 'ken-burns';
    target?: { x: number; y: number; scale: number };
  };
  overlays: TextOverlay[];
}
```

### 2.2 Storyboard UI (`src/components/storyboard/`)

**shadcn components used:** `Card`, `Button`, `Dialog`, `Select`, `Slider`, `Input`, `Textarea`, `Badge`, `Tooltip`, `DropdownMenu`, `Tabs`, `ScrollArea`

| Component | Description |
|---|---|
| `StoryboardGrid` | Drag-and-drop grid of scene cards (uses `@dnd-kit/core`) |
| `SceneCard` | Card showing screenshot thumbnail, title, transition badge, duration. Hover reveals edit/delete actions |
| `SceneEditor` | Dialog/sheet for editing a single scene: transition type, duration, camera, overlays |
| `TransitionPicker` | Visual picker showing transition previews (fade, slide, zoom etc.) |
| `OverlayEditor` | Add/edit text overlays with position, font (from theme), color |
| `StoryboardPreview` | Slideshow preview playing scenes in sequence with transitions |
| `SceneTemplates` | Pre-built scene types: Intro, Feature Highlight, CTA, Outro |
| `AiSuggestionsPanel` | Shows AI reasoning for each scene, user can accept/reject/modify |

### 2.3 Database Schema Additions

```typescript
storyboards: {
  id, projectId, scenes (JSON), version, status,
  createdAt, updatedAt
}
```

### Verification
- [ ] AI generates coherent storyboard from screenshots
- [ ] Scenes can be reordered via drag-and-drop
- [ ] Each scene's transition/duration/camera is editable
- [ ] Text overlays can be added with theme-matched fonts/colors
- [ ] Slideshow preview plays through scenes
- [ ] Changes persist to database

### Tests (Phase 2)

| Test File | Type | What It Covers |
|---|---|---|
| `__tests__/lib/ai/storyboard-agent.test.ts` | Unit | Prompt construction, response parsing, scene shape validation (mocked LLM) |
| `__tests__/lib/ai/scene-enhancer.test.ts` | Unit | Frame enhancement, theme color application |
| `__tests__/components/storyboard/scene-card.test.tsx` | Component | Renders scene data, edit/delete actions, transition badge |
| `__tests__/components/storyboard/storyboard-grid.test.tsx` | Component | Drag-and-drop reorder, add/remove scenes |
| `__tests__/components/storyboard/transition-picker.test.tsx` | Component | Selects transition type, updates parent state |
| `e2e/storyboard-flow.spec.ts` | E2E | Capture → storyboard generated → reorder scenes → edit transition → preview plays |

---

## Phase 3 — Voiceover & Keyframe Tagging

**Duration:** ~3 weeks
**Goal:** User uploads voiceover audio, AI transcribes it, user tags keyframes to sync scenes with narration.

### 3.1 Audio Processing (`src/lib/audio/`)

#### [NEW] `src/lib/audio/transcription.ts`
- Sends audio to Whisper API (or local whisper.cpp)
- Returns transcript with **word-level timestamps**
- Groups words into sentences/paragraphs with boundary markers

#### [NEW] `src/lib/audio/auto-sync.ts`
- Takes transcript + storyboard scenes
- Uses AI to match transcript segments to scenes based on content
- Detects pauses (>500ms gaps) as natural transition points
- Proposes keyframe placements: `{ sceneId, startTime, endTime }`

#### [NEW] `src/app/api/audio/route.ts`
- Handles multipart file upload (MP3, WAV, M4A)
- Stores to `uploads/audio/`
- Triggers transcription job
- Returns transcription + auto-sync suggestions

### 3.2 Keyframe UI (`src/components/audio/`)

**shadcn components used:** `Button`, `Slider`, `Badge`, `Tooltip`, `ScrollArea`, `Card`, `Switch`, `Alert`, `Tabs`

| Component | Description |
|---|---|
| `AudioUploader` | Drag-and-drop upload zone with format validation |
| `WaveformView` | WaveSurfer.js waveform with playback controls (play/pause/scrub) |
| `TranscriptPanel` | Scrollable transcript with clickable timestamps, highlighted current word |
| `KeyframeMarkers` | Draggable markers on the waveform — each marks a scene boundary |
| `SceneSyncView` | Split view: waveform on top, storyboard thumbnails below, lines connecting keyframes to scenes |
| `AutoSyncButton` | Triggers AI auto-sync, shows suggested keyframe placements as ghost markers |
| `TimingTable` | Table showing each scene's start time, end time, duration, transition duration |

### 3.3 Database Schema Additions

```typescript
audio_tracks: {
  id, projectId, fileUrl, duration, transcript (JSON),
  createdAt
}

keyframes: {
  id, projectId, sceneId, startTime, endTime,
  transitionDuration, isAutoGenerated
}
```

### Verification
- [ ] Audio uploads in MP3/WAV/M4A work
- [ ] Whisper transcription returns word-level timestamps
- [ ] Waveform displays correctly with playback
- [ ] Keyframe markers are draggable on the waveform
- [ ] Auto-sync suggests reasonable keyframe placements
- [ ] Scene durations auto-adjust based on keyframe positions
- [ ] Transcript highlights sync with audio playback

### Tests (Phase 3)

| Test File | Type | What It Covers |
|---|---|---|
| `__tests__/lib/audio/transcription.test.ts` | Unit | Whisper API call shape, response parsing, timestamp extraction (mocked) |
| `__tests__/lib/audio/auto-sync.test.ts` | Unit | Transcript-to-scene matching logic, pause detection, keyframe calculation |
| `__tests__/components/audio/audio-uploader.test.tsx` | Component | File type validation, drag-and-drop, upload progress |
| `__tests__/components/audio/keyframe-markers.test.tsx` | Component | Marker rendering, dragging, snapping to scene boundaries |
| `__tests__/components/audio/timing-table.test.tsx` | Component | Displays correct start/end times, editable durations |
| `e2e/audio-sync-flow.spec.ts` | E2E | Upload audio → transcript appears → drag keyframes → auto-sync → timing table updates |

---

## Phase 4 — Motion Canvas Code Generation

**Duration:** ~3 weeks
**Goal:** AI generates Motion Canvas TypeScript code from the timed storyboard, renders a preview.

### 4.1 Code Generator (`src/lib/codegen/`)

#### [NEW] `src/lib/codegen/project-generator.ts`
- Scaffolds a Motion Canvas project in `motion-canvas/` directory
- Generates `vite.config.ts`, `package.json`, `tsconfig.json`

#### [NEW] `src/lib/codegen/scene-generator.ts`
- For each storyboard scene, generates a Motion Canvas scene file:
  - Imports the screenshot as an image node
  - Applies the correct transition (fade, slide, zoom) using Motion Canvas signals
  - Adds text overlays with fonts/colors from theme manifest
  - Applies camera movements (position, scale animations)
  - Sets correct timing based on keyframe map

#### [NEW] `src/lib/codegen/transition-library.ts`
- Pre-built transition implementations in Motion Canvas:
  - `fadeTransition(duration, easing)`
  - `slideTransition(direction, duration, easing)`
  - `zoomTransition(target, duration, easing)`
  - `morphTransition(fromRect, toRect, duration)`
  - `wipeTransition(direction, duration)`

#### [NEW] `src/lib/codegen/audio-integrator.ts`
- Generates audio embedding code for Motion Canvas
- Ensures audio track starts at correct offset
- Handles audio fade-in/fade-out

#### [NEW] `src/lib/render/render-engine.ts`
- Headless Motion Canvas rendering (using its CLI/API)
- Renders to image sequence → FFmpeg → MP4
- Progress reporting back to frontend

### 4.2 Code Generation UI (`src/components/generate/`)

**shadcn components used:** `Card`, `Button`, `Tabs`, `Progress`, `Badge`, `Alert`, `ScrollArea`, `Dialog`

| Component | Description |
|---|---|
| `GenerateButton` | Big "Generate Video" CTA. Shows confirmation dialog with summary |
| `CodePreview` | Syntax-highlighted (Monaco or CodeMirror) view of generated Motion Canvas code. Editable for power users |
| `RenderProgress` | Multi-step progress: Generating code → Installing deps → Rendering frames → Encoding video |
| `PreviewPlayer` | Video player showing the rendered preview |
| `ErrorPanel` | Shows any render errors with suggested fixes |

### 4.3 AI Code Review

#### [NEW] `src/lib/ai/code-reviewer.ts`
- After code generation, AI reviews the generated Motion Canvas code for:
  - Timing issues (scenes too short/long)
  - Visual issues (text overlapping, bad contrast)
  - Missing transitions
- Suggests improvements before rendering

### Verification
- [ ] Generated Motion Canvas project compiles without errors
- [ ] Transitions render correctly for all types
- [ ] Screenshots display crisp at target resolution
- [ ] Text overlays use correct fonts/colors from theme
- [ ] Audio syncs with scenes at keyframed timestamps
- [ ] Preview video plays in browser
- [ ] Code is editable and re-renderable

### Tests (Phase 4)

| Test File | Type | What It Covers |
|---|---|---|
| `__tests__/lib/codegen/project-generator.test.ts` | Unit | Correct vite.config, package.json, tsconfig generation |
| `__tests__/lib/codegen/scene-generator.test.ts` | Unit | Scene code output matches expected Motion Canvas syntax per transition type |
| `__tests__/lib/codegen/transition-library.test.ts` | Unit | Each transition function produces valid Motion Canvas code |
| `__tests__/lib/codegen/audio-integrator.test.ts` | Unit | Audio sync code, offset calculation, fade handling |
| `__tests__/lib/ai/code-reviewer.test.ts` | Unit | Review catches timing issues, contrast issues (mocked LLM) |
| `__tests__/lib/render/render-engine.test.ts` | Integration | Generated project compiles and renders a single frame (requires Motion Canvas) |
| `__tests__/components/generate/code-preview.test.tsx` | Component | Syntax highlighting, edit + re-render flow |

---

## Phase 5 — Timeline Editor & Export

**Duration:** ~3 weeks
**Goal:** Visual timeline for final adjustments, multi-track editing, and production export.

### 5.1 Timeline Engine (`src/lib/timeline/`)

#### [NEW] `src/lib/timeline/timeline-state.ts`
- Zustand store managing multi-track timeline state
- Tracks: video scenes, audio waveform, text overlays, transition markers
- Supports operations: trim, extend, split, delete, move

#### [NEW] `src/lib/timeline/playback-engine.ts`
- Coordinates playback across all tracks
- Maintains a playhead position synced to real time
- Triggers re-renders when edits are made within the "dirty" range

### 5.2 Timeline UI (`src/components/timeline/`)

**shadcn components used:** `Button`, `Slider`, `Select`, `Dialog`, `Tooltip`, `Badge`, `Separator`, `ScrollArea`, `Popover`, `Switch`, `DropdownMenu`

| Component | Description |
|---|---|
| `TimelineContainer` | Full-width timeline with zoom controls, playhead, time ruler |
| `VideoTrack` | Scene thumbnails on timeline, draggable edges for trim |
| `AudioTrack` | Voiceover waveform rendered inline on timeline, volume keyframes |
| `MusicTrack` | Background music waveform, independent volume control, fade in/out handles |
| `TextTrack` | Text overlay clips with in/out points |
| `TransitionMarkers` | Diamond markers between scenes showing transition type |
| `PlaybackControls` | Play/pause, skip, speed control (0.5x–2x), loop toggle |
| `MiniPreview` | Live video preview synced to playhead position |
| `PropertyPanel` | Context-sensitive panel showing properties of selected element |
| `BackgroundMusicUploader` | Upload MP3/WAV for background music, volume slider, loop toggle |
| `ExportDialog` | Resolution, format, frame rate selection. Batch export toggle. Shows estimated file size |
| `ExportProgress` | Render progress with ETA, cancel button. Shows per-resolution progress for batch exports |
| `ProjectDownloadButton` | Zips and downloads the generated Motion Canvas project for editing outside VDOMake |

### 5.3 Background Music

#### [NEW] `src/lib/audio/music-mixer.ts`
- Accepts background music file + voiceover audio
- Implements volume ducking: automatically lowers music during voiceover segments
- Generates fade-in/fade-out at track boundaries
- Outputs mixed audio configuration for Motion Canvas code generation

### 5.4 Export Pipeline

#### [NEW] `src/lib/render/export-pipeline.ts`
- Takes final timeline state (including background music mix)
- Regenerates Motion Canvas code with all adjustments
- Renders at target resolution (720p / 1080p / 4K)
- Encodes to MP4 (H.264) or WebM via FFmpeg (`fluent-ffmpeg`)
- Outputs to `uploads/exports/`
- **Batch export:** queues multiple render jobs for different resolutions (e.g., 1080p + 720p + 4K simultaneously)

#### [NEW] `src/lib/render/project-packager.ts`
- Zips the `motion-canvas/` directory using `archiver`
- Includes all assets (screenshots, audio, fonts)
- Returns download URL for the `.zip` file
- Allows power users to further customize the Motion Canvas project outside VDOMake

#### [NEW] `src/app/api/export/route.ts`
- Accepts export configuration, validated with `export-config.schema.ts`
- Supports `mode: 'single' | 'batch'` and `format: 'video' | 'project'`
- Enqueues render job(s) via BullMQ
- Returns SSE endpoint URL for progress (`/api/export/progress?jobId=...`)

#### [NEW] `src/app/api/export/progress/route.ts`
- SSE endpoint streaming export progress: `rendering_frames`, `encoding`, `complete`
- For batch exports, streams per-resolution progress
- Uses `createSSEStream()` from `src/lib/utils/sse.ts`

### 5.5 Database Schema Additions

```typescript
exports: {
  id, projectId, resolution, format, frameRate,
  fileUrl, fileSize, status, progress,
  isBatch, batchGroupId,  // links batch exports together
  startedAt, completedAt
}

background_music: {
  id, projectId, fileUrl, duration, volume,
  fadeInDuration, fadeOutDuration, loop,
  createdAt
}
```

### Verification
- [ ] Timeline renders all tracks correctly (video, voiceover, music, text)
- [ ] Scenes can be trimmed/extended by dragging edges
- [ ] Playback syncs video + voiceover + music + text tracks
- [ ] Background music uploads, plays, volume ducking works during voiceover
- [ ] Export produces valid MP4 at 1080p/60fps
- [ ] Batch export produces multiple resolutions simultaneously
- [ ] Export progress shows real-time SSE updates
- [ ] Exported video matches timeline preview exactly
- [ ] Project download produces valid Motion Canvas zip

### Tests (Phase 5)

| Test File | Type | What It Covers |
|---|---|---|
| `__tests__/lib/timeline/timeline-state.test.ts` | Unit | Trim, extend, split, delete, move operations on timeline state |
| `__tests__/lib/timeline/playback-engine.test.ts` | Unit | Playhead sync, multi-track coordination, speed changes |
| `__tests__/lib/audio/music-mixer.test.ts` | Unit | Volume ducking, fade in/out, loop behavior |
| `__tests__/lib/render/export-pipeline.test.ts` | Integration | Regenerates code from timeline, renders, encodes (may be slow) |
| `__tests__/lib/render/project-packager.test.ts` | Unit | Zip creation, asset inclusion, correct file structure |
| `__tests__/components/timeline/video-track.test.tsx` | Component | Scene thumbnails render, edge dragging, trim behavior |
| `__tests__/components/timeline/playback-controls.test.tsx` | Component | Play/pause, speed selector, loop toggle |
| `__tests__/components/timeline/export-dialog.test.tsx` | Component | Resolution/format/fps selection, batch toggle, estimated file size |
| `e2e/export-flow.spec.ts` | E2E | Full pipeline: storyboard → audio → generate → timeline adjust → export MP4 |

---

## Phase Summary & Timeline

```mermaid
gantt
    title VDOMake Development Phases
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Phase 0
    Scaffolding & Tooling          :p0, 2026-08-18, 7d

    section Phase 1
    Capture Engine (Playwright)    :p1a, after p0, 7d
    Capture UI + Theme Extraction  :p1b, after p1a, 7d

    section Phase 2
    AI Storyboard Generation       :p2a, after p1b, 7d
    Storyboard Editor UI           :p2b, after p2a, 14d

    section Phase 3
    Audio Processing + Whisper     :p3a, after p2b, 7d
    Keyframe Tagging UI            :p3b, after p3a, 14d

    section Phase 4
    Motion Canvas Code Gen         :p4a, after p3b, 14d
    Render Pipeline                :p4b, after p4a, 7d

    section Phase 5
    Timeline Editor                :p5a, after p4b, 14d
    Export Pipeline                :p5b, after p5a, 7d
```

| Phase | Duration | Key Deliverable |
|---|---|---|
| **Phase 0** | 1 week | Running app shell with shadcn/ui + Impeccable + lint/test infra |
| **Phase 1** | 2 weeks | URL → screenshots + theme manifest |
| **Phase 2** | 3 weeks | AI storyboard with drag-and-drop editor |
| **Phase 3** | 3 weeks | Voiceover upload, transcription, keyframe sync |
| **Phase 4** | 3 weeks | Motion Canvas code generation + preview render |
| **Phase 5** | 3 weeks | Timeline editor + production export |
| **Total** | **~15 weeks** | |

---

## CI / Quality Gates

Every PR / push should run the following pipeline:

```mermaid
flowchart LR
    A["git push"] --> B["ESLint + Prettier"]
    B --> C["TypeScript tsc --noEmit"]
    C --> D["Vitest (unit + integration)"]
    D --> E["Impeccable detect"]
    E --> F["Playwright E2E"]
    F --> G["✅ Merge"]
```

| Gate | Command | Blocks Merge? |
|---|---|---|
| Lint | `npm run lint` | ✅ Yes |
| Format | `npm run format:check` | ✅ Yes |
| Types | `tsc --noEmit` | ✅ Yes |
| Unit Tests | `npm run test` | ✅ Yes (coverage ≥ 75%) |
| Design Lint | `npm run lint:design` | ⚠️ Warning (non-blocking initially, enforce after Phase 2) |
| E2E Tests | `npm run test:e2e` | ✅ Yes |

---

## shadcn/ui Component Map (All Phases)

A complete reference of which shadcn components are used where:

| shadcn Component | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|---|
| `Button` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `Card` | ✓ | ✓ | ✓ | ✓ | ✓ | |
| `Input` | | ✓ | ✓ | | | |
| `Dialog` | | | ✓ | | ✓ | ✓ |
| `Select` | | ✓ | ✓ | | | ✓ |
| `Slider` | | | ✓ | ✓ | | ✓ |
| `Progress` | | ✓ | | | ✓ | ✓ |
| `Badge` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `Tabs` | | | ✓ | ✓ | ✓ | |
| `ScrollArea` | ✓ | | ✓ | ✓ | ✓ | ✓ |
| `Tooltip` | | | ✓ | ✓ | | ✓ |
| `DropdownMenu` | ✓ | | ✓ | | | ✓ |
| `Textarea` | | | ✓ | | | |
| `Switch` | | | | ✓ | | ✓ |
| `Alert` | | ✓ | | ✓ | ✓ | |
| `Separator` | ✓ | | | | | ✓ |
| `Skeleton` | | ✓ | | | | |
| `Sheet` | ✓ | | | | | |
| `Popover` | | | | | | ✓ |
| `Toast` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `Command` | | | | | | |

---

## Open Questions

> [!IMPORTANT]
> **Motion Canvas vs Remotion:** The plan currently uses Motion Canvas. Remotion has a larger ecosystem and React-based authoring. Should we support both, or commit to one? Motion Canvas’s generator-based API is arguably better for programmatic generation.

> [!WARNING]
> **Self-hosted vs Cloud:** The capture engine (Playwright) and render engine (Motion Canvas + FFmpeg) are resource-intensive. Should Phase 0 target local-only development, with cloud deployment deferred? Or set up Docker from the start?

> [!NOTE]
> **Scope of MVP:** Phases 0–2 (scaffolding + capture + storyboard) deliver a usable product even without audio sync. Should we consider shipping an early preview after Phase 2?
