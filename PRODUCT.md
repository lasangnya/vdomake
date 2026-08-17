# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: content creators and YouTubers who review websites, compare tools, and
make SaaS tutorials. They currently record screens with Loom/Screen Studio and
hand-animate in After Effects; they want polished, animated output without
motion-design skills.

Secondary: product and marketing teams that need on-brand demo videos for
landing pages, Product Hunt launches, and investor decks, and must re-iterate
fast when the product UI changes.

Tertiary: developers and designers showcasing portfolio or open-source projects,
who value localhost support and the editable, code-based output.

## Product Purpose

VDOMake turns any website URL into a polished, animated video in minutes instead
of the 4–8 hours a skilled motion designer needs today. The user pastes a URL,
an agent captures and understands the site, generates a storyboard they can
refine, syncs their voiceover, and produces a production-ready animated video.
Success is measured by: URL → exported video in under 15 minutes, storyboard
acceptance ≥ 70%, and export completion ≥ 85% of started projects.

## Positioning

The only tool that combines web-aware capture, design-aware AI, and code-based
video generation (Motion Canvas) in one workflow. Output is generated code, not
a binary: version-controllable, parameterizable, and infinitely tweakable — a
differentiator no screen recorder can copy.

## Operating Context

Five-phase pipeline, each producing a reviewable artifact before moving on:
1. Capture — headless Playwright screenshots (high-DPI, smart scroll, multi-viewport) + theme manifest (colors, fonts, spacing, brand assets).
2. Storyboard — AI proposes an ordered scene sequence the user reorders/edits (transitions, duration, camera, text overlays).
3. Voiceover & Keyframes — user uploads MP3/WAV/M4A, Whisper transcribes with word timestamps, user tags scene keyframes on a waveform (AI auto-sync suggested).
4. Code Generation — AI writes Motion Canvas TypeScript (scenes, transitions, overlays, audio sync); power users can edit the code.
5. Timeline & Export — visual multi-track timeline for final trims, background music with ducking, then export MP4/WebM at 720p/1080p/4K or download the project as a zip.

Users bring their own AI API keys (OpenAI, Anthropic, Gemini, or local Ollama/LM
Studio) and choose which provider powers each task. Everything runs on the
user's own machine during development; local Postgres + Redis via Docker.

## Capabilities and Constraints

- Web capture: public URLs and localhost; post-MVP: authenticated sites via cookie injection, SPA route discovery, interaction capture.
- Theme intelligence: color palette, typography, spacing rhythm, radii, shadows, brand asset extraction → structured JSON manifest.
- AI provider abstraction: unified interface across OpenAI (GPT-4o vision, Whisper), Anthropic Claude, Gemini 2.5, and OpenAI-compatible local servers; per-task routing with fallback chains; keys encrypted at rest (AES-256-GCM), never logged.
- Storyboard editor: drag-and-drop reorder, per-scene transition/duration/camera/overlay editing, slideshow preview.
- Audio: transcription with word-level timestamps, waveform editing, draggable keyframe markers, auto-sync suggestions, pause detection.
- Code generation: Motion Canvas projects; fade/slide/zoom/wipe/morph transitions; theme-matched typography and colors; embeddable voiceover.
- Export: FFmpeg encoding via fluent-ffmpeg; batch multi-resolution export; project download as zip.
- MVP is end-to-end functional with a narrower feature set (single viewport capture, basic transitions, manual keyframe tagging); the full surface is post-MVP.
- Undecided: Motion Canvas vs Remotion support (currently Motion Canvas); self-hosted vs cloud deployment (currently local-first via Docker).

## Brand Commitments

- Name: VDOMake — "Make videos from the DOM."
- Tagline: "Paste a URL. Get a video."

## Evidence on Hand

- Product document: `vdomake_product_document.md` (problem statement, workflow, personas, competitive landscape, success metrics).
- Implementation plan: `implementation_plan.md` (5-phase build plan with tech stack).
- No user testimonials, case studies, or customer benchmarks exist — future work must not fabricate them.

## Product Principles

1. The storyboard is the creative control surface — the user shapes the narrative before any video is generated.
2. Keyframe tagging is the critical human-in-the-loop moment that makes output feel synced and intentional.
3. Code-based output is the key differentiator — generated projects must stay editable and re-renderable.
4. Provider-agnostic by design — users bring their own keys; the platform never locks them into one AI vendor.
5. Every phase produces an artifact the user can review and adjust before moving forward.

## Accessibility & Inclusion

No product-specific accessibility requirements have been established beyond the
default expectation that the web app itself be accessible (WCAG 2.1 AA baseline
for the editor surfaces).
