import { nanoid } from 'nanoid';
import { sceneSchema, type SceneInput } from '@vdomake/validators';
import { buildContactSheet as realBuildContactSheet, screenshotToDiskPath } from './contact-sheet';
import { UPLOADS_ROOT } from '@/lib/utils/uploads-path';
import type {
  Scene,
  Storyboard,
  TransitionEasing,
  TransitionType,
  CameraType,
} from '@/types/scene';
import type { ThemeManifest } from '@/types/theme';

export interface StoryboardFrameRef {
  id: string;
  screenshotUrl: string;
}

export interface StoryboardAgentInput {
  projectId: string;
  pageTitle: string;
  url: string;
  frames: StoryboardFrameRef[];
  themeManifest: ThemeManifest | null;
}

export interface StoryboardAgentDeps {
  /** Vision callable — wired to the ProviderRouter by the tRPC router. */
  analyzeVision: (prompt: string, image: Buffer, mimeType: string) => Promise<string>;
  /** Builds a single image from frame URLs. Overridable in tests. */
  buildContactSheet?: (screenshotUrls: string[]) => Promise<Buffer>;
  now?: () => Date;
  newId?: () => string;
}

const DEFAULT_DURATION = 4;
const DEFAULT_TRANSITION = {
  type: 'fade' as TransitionType,
  duration: 0.6,
  easing: 'smooth' as TransitionEasing,
};
const DEFAULT_CAMERA = { type: 'static' as CameraType };

function themeSummary(theme: ThemeManifest | null): string {
  if (!theme) {
    return 'No theme extracted — use sensible defaults (white background, dark text, system font).';
  }
  const colors = theme.colors.map((c) => `${c.hex} (${c.role})`).join(', ');
  const fonts = theme.fonts.map((f) => f.family).join(', ');
  return `Colors: ${colors}. Fonts: ${fonts}. Spacing unit: ${theme.spacing.unit}px. Border radius: ${theme.borderRadius.small}/${theme.borderRadius.medium}/${theme.borderRadius.large}px.`;
}

/**
 * Builds the vision prompt for storyboard generation. The model receives a
 * contact sheet of the captured screenshots and must return a strict JSON
 * array of scenes referencing screenshots by their 1-based index.
 */
export function buildStoryboardPrompt(input: StoryboardAgentInput): string {
  return [
    'You are a senior video editor creating a motion-graphics storyboard for a website walkthrough video.',
    '',
    `Site: ${input.pageTitle || input.url}`,
    `Captured screenshots: ${input.frames.length}`,
    '',
    `Extracted theme: ${themeSummary(input.themeManifest)}`,
    '',
    'The attached image is a contact sheet of the captured screenshots, ordered left-to-right, top-to-bottom. Refer to screenshots by their 1-based index (1 = first screenshot).',
    '',
    'Create a compelling, well-paced storyboard that walks a viewer through the site: hook, key sections, and a closing call to action. Return ONLY a JSON array (no markdown fences, no commentary) where each item has this exact shape:',
    '',
    '```json',
    '[{',
    '  "title": "Short scene title (max ~40 chars)",',
    '  "description": "One or two sentences: what this scene shows and why.",',
    '  "screenshotIndex": 1,',
    '  "duration": 4,',
    '  "transition": { "type": "fade|slide|zoom|morph|wipe|dissolve", "duration": 0.6, "easing": "smooth|spring|linear" },',
    '  "camera": { "type": "static|pan|zoom-to|ken-burns" },',
    '  "overlays": [ { "text": "Overlay text (use theme colors; omit if none)", "position": { "x": 12, "y": 12 }, "fontSize": 48, "color": "#hex" } ]',
    '}]',
    '```',
    '',
    'Rules:',
    '- Between 3 and 10 scenes.',
    '- screenshotIndex must be between 1 and the number of screenshots.',
    "- Use the site's real colors for overlay text; prefer high contrast.",
    "- Scenes should feel like a video: vary camera moves and transitions, don't make every scene static.",
    '- durations between 2 and 12 seconds.',
    '',
  ].join('\n');
}

/** Extracts the first JSON array/object from a model response, tolerating markdown fences or prose around it. */
export function extractJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.search(/[[{]/);
  if (start === -1) {
    throw new Error('No JSON found in the model response');
  }
  const end = candidate.lastIndexOf(candidate[start] === '[' ? ']' : '}');
  if (end === -1 || end <= start) {
    throw new Error('Unterminated JSON in the model response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

const TRANSITIONS: TransitionType[] = ['fade', 'slide', 'zoom', 'morph', 'wipe', 'dissolve'];
const EASINGS: TransitionEasing[] = ['smooth', 'spring', 'linear'];
const CAMERAS: CameraType[] = ['static', 'pan', 'zoom-to', 'ken-burns'];

function asEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampDuration(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DURATION;
  return Math.min(Math.max(n, 2), 12);
}

function clampTransitionDuration(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TRANSITION.duration;
  return Math.min(Math.max(n, 0.2), 4);
}

function toOverlay(value: unknown, index: number): Scene['overlays'][number] | null {
  if (typeof value !== 'object' || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.text !== 'string' || o.text.length === 0 || o.text.length > 500) return null;
  const pos = (typeof o.position === 'object' && o.position !== null ? o.position : {}) as Record<
    string,
    unknown
  >;
  return {
    id: `ov-${index}-${nanoid(6)}`,
    text: o.text,
    position: {
      x: clampUnit(pos.x),
      y: clampUnit(pos.y),
    },
    fontSize: clampFontSize(o.fontSize),
    color: typeof o.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : '#ffffff',
    fontFamily: typeof o.fontFamily === 'string' ? o.fontFamily : undefined,
  };
}

function clampUnit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 10;
}

function clampFontSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, 12), 96) : 48;
}

/**
 * Parses a model response into validated scenes. Each scene is mapped to a
 * real frame by screenshotIndex (1-based), assigned an id + order, and
 * validated against sceneSchema with safe fallbacks for missing fields.
 */
export function parseStoryboardResponse(
  text: string,
  frames: StoryboardFrameRef[],
  newId = () => nanoid(12),
): Scene[] {
  const parsed = extractJsonBlock(text);
  if (!Array.isArray(parsed)) {
    throw new TypeError('Model response JSON was not an array of scenes');
  }

  const scenes: Scene[] = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const raw = parsed[index];
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const screenshotIndex =
      typeof item.screenshotIndex === 'number' ? Math.floor(item.screenshotIndex) : Number.NaN;
    const frame = frames[Number.isFinite(screenshotIndex) ? screenshotIndex - 1 : -1] ?? frames[0];

    const transitionRaw =
      typeof item.transition === 'object' && item.transition !== null
        ? (item.transition as Record<string, unknown>)
        : {};
    const cameraRaw =
      typeof item.camera === 'object' && item.camera !== null
        ? (item.camera as Record<string, unknown>)
        : {};
    const target =
      typeof cameraRaw.target === 'object' && cameraRaw.target !== null
        ? (cameraRaw.target as Record<string, unknown>)
        : undefined;

    const overlays = Array.isArray(item.overlays)
      ? item.overlays
          .map((o, ovIndex) => toOverlay(o, ovIndex))
          .filter((o): o is Scene['overlays'][number] => o !== null)
          .slice(0, 3)
      : [];

    const candidate: SceneInput = {
      id: newId(),
      order: index,
      screenshotId: frame?.id ?? '',
      title:
        typeof item.title === 'string' && item.title
          ? item.title.slice(0, 200)
          : `Scene ${index + 1}`,
      description: typeof item.description === 'string' ? item.description.slice(0, 1000) : '',
      duration: clampDuration(item.duration),
      transition: {
        type: asEnum(transitionRaw.type, TRANSITIONS, DEFAULT_TRANSITION.type),
        duration: clampTransitionDuration(transitionRaw.duration),
        easing: asEnum(transitionRaw.easing, EASINGS, DEFAULT_TRANSITION.easing),
      },
      camera: {
        type: asEnum(cameraRaw.type, CAMERAS, DEFAULT_CAMERA.type),
        target:
          target !== undefined
            ? {
                x: clampUnit(target.x),
                y: clampUnit(target.y),
                scale: clampScale(target.scale),
              }
            : undefined,
      },
      overlays,
    };

    const result = sceneSchema.safeParse(candidate);
    if (result.success) {
      scenes.push(result.data as Scene);
    }
  }

  if (scenes.length === 0) {
    throw new Error('The model returned no valid scenes');
  }
  return scenes;
}

function clampScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 4) : 1.3;
}

/**
 * Generates a storyboard for a captured site. Builds a contact sheet from the
 * frames, asks the vision model for a scene list, parses + validates it.
 */
export async function generateStoryboard(
  input: StoryboardAgentInput,
  deps: StoryboardAgentDeps,
): Promise<Storyboard> {
  const buildSheet =
    deps.buildContactSheet ??
    (async (urls: string[]) => {
      const paths = urls
        .map((url) => screenshotToDiskPath(url, UPLOADS_ROOT))
        .filter((p): p is string => p !== null);
      return realBuildContactSheet(paths);
    });

  const sheet = await buildSheet(input.frames.map((f) => f.screenshotUrl));
  const prompt = buildStoryboardPrompt(input);
  const raw = await deps.analyzeVision(prompt, sheet, 'image/png');
  const scenes = parseStoryboardResponse(raw, input.frames, deps.newId);

  const now = deps.now?.() ?? new Date();
  return {
    id: `sb-${input.projectId}`,
    projectId: input.projectId,
    scenes,
    version: 1,
    status: 'draft',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
