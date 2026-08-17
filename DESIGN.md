# Design

<!-- impeccable:design-schema 1 -->

> Visual world for VDOMake — an AI-powered website-to-video platform. Operate-mode
> product UI with a premium creative-tool feel (the workflow the visitor trusts
> to do professional work).

## Visual world

- **Mood:** confident, precise, creative-tool. Think pro video/dashboard SaaS:
  calm surface, sharp details, one assertive accent. Not playful, not corporate-bootstrap.
- **Mode:** Operate for the app shell/settings/editor surfaces; the landing page
  is Persuade but stays in the same world (evidence-driven, no fabricated claims).

## Tokens

- **Base (neutral):** zinc. Background `zinc-50`, surfaces white, text `zinc-900`,
  muted text `zinc-500`, borders `zinc-200`.
- **Accent:** violet. `violet-600` (#7c3aed) for primary actions, active phase,
  links-focus rings. Hover darkens to `violet-500` on dark fills, `violet-50`
  tints for active backgrounds (`bg-violet-50` + `text-violet-900`).
- **Semantic status:** emerald = connected/complete, red = invalid/error,
  amber = rate-limited/warning, sky/fuchsia/amber/emerald = provider identity colors.
- **Radius:** `rounded-lg` (0.5rem) cards/buttons/inputs; `rounded-full` pills, badges, avatars.
- **Shadow:** `shadow-sm` on cards; 1px borders everywhere else. No heavy elevation.
- **Typography:** Geist Sans (via `next/font`) as the interface font; `font-mono`
  reserved for API keys, model names, and code artifacts. Headings `tracking-tight`.

## Icons

Lucide icons, `size-4` inline default (shadcn preset). Icon in a `9x9` rounded-lg
tile tinted with the component's semantic color is the recurring motif
(phase cards, provider identity, empty states).

## Components

- **Buttons:** shadcn Button (Base UI). Default = violet fill; outline/ghost for
  secondary. `size="sm"` for dense table/toolbar actions.
- **Cards:** shadcn Card — `rounded-lg border bg-white shadow-sm`. Used for
  provider cards, phase steps, empty states, usage blocks.
- **Badges:** `rounded-full` pills; `variant="outline"` for capability labels,
  tinted fills for status.
- **Forms:** shadcn Input/Select/Switch/Tabs per Base UI conventions. API keys use
  monospace + masked input with eye/paste affordances and a live validity glyph.
- **Shell:** fixed 256px sidebar (desktop, `zinc-50` content area with white
  surface inside), Sheet drawer on mobile, 56px TopNav. Sidebar holds the 5-phase
  pipeline stepper (numbered circles → check on complete), Dashboard and Settings
  nav at the foot.

## Surfaces

- **Landing (`/`)** — persuasive hero: "Paste a URL. Get a video." with the
  five-phase strip beneath. No invented proof (product truth only).
- **Settings (`/settings`)** — Tabs: API Keys (provider cards grid), Task Routing
  (table: task → primary provider/model → fallback), Usage.
- **Projects (`/projects`)** — pipeline entry; empty state + provider gate until
  capture ships.

## Anti-patterns

No default Tailwind blue buttons, no dashed-border-only empty cards without an
icon+action, no gray-on-gray text without a `zinc-500/600` hierarchy, no raw
bootstrap gradients, no Inter/Arial fallback outside the Geist system.