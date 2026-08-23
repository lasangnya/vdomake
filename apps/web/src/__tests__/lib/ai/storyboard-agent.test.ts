import { describe, expect, it } from 'vitest';
import {
  buildStoryboardPrompt,
  extractJsonBlock,
  parseStoryboardResponse,
  generateStoryboard,
} from '@/lib/ai/storyboard-agent';
import type { StoryboardAgentInput } from '@/lib/ai/storyboard-agent';

const INPUT: StoryboardAgentInput = {
  projectId: 'p-1',
  pageTitle: 'Example',
  url: 'https://example.com',
  frames: [
    { id: 'f-1', screenshotUrl: '/api/files/screenshots/p-1/frame-0000.png' },
    { id: 'f-2', screenshotUrl: '/api/files/screenshots/p-1/frame-0001.png' },
    { id: 'f-3', screenshotUrl: '/api/files/screenshots/p-1/frame-0002.png' },
  ],
  themeManifest: {
    colors: [
      { hex: '#ffffff', role: 'background', usage: 10 },
      { hex: '#0f172a', role: 'text', usage: 8 },
    ],
    fonts: [{ family: 'Inter', weights: [400], sizes: [16], usage: 5 }],
    spacing: { unit: 8, rhythm: [8, 16] },
    borderRadius: { small: 4, medium: 8, large: 12 },
    shadows: [],
    brandAssets: {},
    sourceUrl: 'https://example.com',
    extractedAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('buildStoryboardPrompt', () => {
  it('mentions the theme palette and screenshot count', () => {
    const prompt = buildStoryboardPrompt(INPUT);
    expect(prompt).toContain('#0f172a (text)');
    expect(prompt).toContain('Inter');
    expect(prompt).toContain('Captured screenshots: 3');
  });

  it('handles a missing theme', () => {
    const prompt = buildStoryboardPrompt({ ...INPUT, themeManifest: null });
    expect(prompt).toContain('No theme extracted');
  });
});

describe('extractJsonBlock', () => {
  it('parses a fenced JSON array', () => {
    const out = extractJsonBlock('Here you go:\n```json\n[{"title":"A"}]\n```');
    expect(out).toEqual([{ title: 'A' }]);
  });

  it('parses bare JSON', () => {
    expect(extractJsonBlock('[{"title":"A"}]')).toEqual([{ title: 'A' }]);
  });

  it('throws on missing JSON', () => {
    expect(() => extractJsonBlock('no json here')).toThrow(/No JSON found/);
  });
});

describe('parseStoryboardResponse', () => {
  it('maps screenshotIndex to frames and fills defaults', () => {
    const text = JSON.stringify([
      {
        title: 'Hero',
        description: 'Open on the hero',
        screenshotIndex: 1,
        duration: 6,
        transition: { type: 'zoom', duration: 0.8, easing: 'spring' },
        camera: { type: 'zoom-to', target: { x: 50, y: 40, scale: 1.5 } },
        overlays: [
          { text: 'Paste a URL', position: { x: 10, y: 10 }, fontSize: 48, color: '#0f172a' },
        ],
      },
      { title: 'Features', screenshotIndex: 3 },
    ]);
    const scenes = parseStoryboardResponse(text, INPUT.frames, () => 'id');
    expect(scenes).toHaveLength(2);
    expect(scenes[0].screenshotId).toBe('f-1');
    expect(scenes[0].duration).toBe(6);
    expect(scenes[0].transition.type).toBe('zoom');
    expect(scenes[0].camera.target?.scale).toBe(1.5);
    expect(scenes[0].overlays[0].text).toBe('Paste a URL');
    expect(scenes[1].screenshotId).toBe('f-3');
    expect(scenes[1].transition.type).toBe('fade'); // default
    expect(scenes[1].order).toBe(1);
  });

  it('clamps durations and falls back out-of-range indices to frame 0', () => {
    const text = JSON.stringify([{ title: 'A', screenshotIndex: 99, duration: 999 }]);
    const scenes = parseStoryboardResponse(text, INPUT.frames, () => 'id');
    expect(scenes[0].duration).toBe(12);
    expect(scenes[0].screenshotId).toBe('f-1');
  });

  it('defaults leniently for sparse scene items', () => {
    const text = JSON.stringify([{ title: 'ok', screenshotIndex: 1 }, { screenshotIndex: 'x' }]);
    const scenes = parseStoryboardResponse(text, INPUT.frames, () => 'id');
    expect(scenes).toHaveLength(2);
    expect(scenes[0].title).toBe('ok');
    // Second item: invalid index falls back to frame 0, title gets a default.
    expect(scenes[1].screenshotId).toBe('f-1');
    expect(scenes[1].title).toBe('Scene 2');
  });

  it('throws when nothing parses', () => {
    expect(() => parseStoryboardResponse('nope', INPUT.frames)).toThrow();
  });
});

describe('generateStoryboard', () => {
  it('returns a validated storyboard from the vision callable', async () => {
    const vision = async () =>
      JSON.stringify([{ title: 'Scene one', screenshotIndex: 1, duration: 4 }]);
    const storyboard = await generateStoryboard(INPUT, {
      analyzeVision: vision,
      buildContactSheet: async () => Buffer.from('sheet'),
      now: () => new Date('2026-01-01T00:00:00Z'),
      newId: () => 'id',
    });
    expect(storyboard.projectId).toBe('p-1');
    expect(storyboard.scenes).toHaveLength(1);
    expect(storyboard.scenes[0].screenshotId).toBe('f-1');
    expect(storyboard.status).toBe('draft');
    expect(storyboard.version).toBe(1);
  });
});
