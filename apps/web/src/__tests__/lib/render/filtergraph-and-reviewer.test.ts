import { describe, expect, it } from 'vitest';
import { buildZoompan, buildXfadeChain } from '@/lib/render/filtergraph';
import { parseReviewResponse, buildReviewPrompt } from '@/lib/ai/code-reviewer';
import type { CameraType } from '@/types/scene';

describe('buildZoompan', () => {
  const options = { width: 1920, height: 1080, fps: 30 };

  it('keeps static cameras still', () => {
    const expr = buildZoompan({ type: 'static' as CameraType }, 120, options);
    expect(expr).toContain("z='1'");
    expect(expr).toContain('s=1920x1080');
    expect(expr).toContain('d=120');
  });

  it('produces a progressive zoom for zoom-to', () => {
    const expr = buildZoompan(
      { type: 'zoom-to' as CameraType, target: { x: 50, y: 50, scale: 1.2 } },
      120,
      options,
    );
    expect(expr).toContain('min(1+');
    expect(expr).toContain('1.200');
  });

  it('produces a slow ken-burns zoom', () => {
    const expr = buildZoompan({ type: 'ken-burns' as CameraType }, 150, options);
    expect(expr).toContain('1.08');
  });
});

describe('buildXfadeChain', () => {
  it('returns a pass-through for a single clip', () => {
    const chain = buildXfadeChain([5], [0.5]);
    expect(chain.filtergraph).toBe('[0:v]null[vout]');
    expect(chain.duration).toBe(5);
  });

  it('chains clips with computed offsets', () => {
    const chain = buildXfadeChain([5, 4, 3], [0.5, 0.5]);
    // cum[i-1] - i*td: (5 - .5) = 4.5, (5+4 - 1.0) = 8.0
    expect(chain.offsets).toEqual([4.5, 8]);
    expect(chain.filtergraph).toContain('xfade=transition=fade:duration=0.50:offset=4.50');
    expect(chain.filtergraph).toContain('offset=8.00');
    expect(chain.duration).toBe(11); // 12 total - 2 * 0.5
  });

  it('returns empty for no clips', () => {
    const chain = buildXfadeChain([], []);
    expect(chain.filtergraph).toBe('');
    expect(chain.duration).toBe(0);
  });
});

describe('parseReviewResponse', () => {
  it('parses a fenced JSON array of findings', () => {
    const items = parseReviewResponse(
      '```json\n[{"severity":"error","sceneIndex":0,"message":"Scene too short"},{"severity":"warning","message":"Low contrast"}]\n```',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      severity: 'error',
      sceneIndex: 0,
      message: 'Scene too short',
    });
  });

  it('returns [] for prose without JSON', () => {
    expect(parseReviewResponse('Everything looks good!')).toEqual([]);
  });

  it('tolerates malformed JSON', () => {
    expect(parseReviewResponse('```json\n{not valid\n```')).toEqual([]);
  });

  it('normalizes unknown severities', () => {
    const items = parseReviewResponse('[{"severity":"critical","message":"x"}]');
    expect(items[0].severity).toBe('suggestion');
  });
});

describe('buildReviewPrompt', () => {
  it('embeds the scene code and theme', () => {
    const prompt = buildReviewPrompt({
      scenesCode: [{ index: 0, code: 'export default makeScene2D(...)' }],
      theme: null,
    });
    expect(prompt).toContain('scene 0');
    expect(prompt).toContain('makeScene2D');
    expect(prompt).toContain('Theme palette: unknown');
  });
});
