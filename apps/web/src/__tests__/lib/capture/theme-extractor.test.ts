import { describe, expect, it } from 'vitest';
import {
  buildThemeManifest,
  normalizeColor,
  stripNameHelperCalls,
  collectThemeStats,
  type RawThemeData,
} from '@/lib/capture/theme-extractor';

function baseRaw(): RawThemeData {
  return {
    colors: [
      { hex: '#ffffff', count: 40, kind: 'bg' },
      { hex: '#0f172a', count: 20, kind: 'text' },
      { hex: '#7c3aed', count: 6, kind: 'other' },
      { hex: '#e2e8f0', count: 4, kind: 'border' },
    ],
    fonts: [
      { family: 'Inter', count: 30, weights: [400, 600], sizes: [14, 16, 24] },
      { family: 'Georgia', count: 5, weights: [400], sizes: [18] },
    ],
    spacing: [8, 8, 8, 16, 24, 32],
    borderRadius: [4, 8, 12],
    shadows: [{ color: '#000000', blur: 8, offsetX: 0, offsetY: 2 }],
    logoUrls: ['https://example.com/logo.png'],
    faviconUrl: 'https://example.com/favicon.ico',
    ogImageUrl: 'https://example.com/og.png',
  };
}

describe('normalizeColor', () => {
  it('normalizes rgb() to hex', () => {
    expect(normalizeColor('rgb(255, 255, 255)')).toBe('#ffffff');
  });

  it('expands 3-digit hex', () => {
    expect(normalizeColor('#fff')).toBe('#ffffff');
  });

  it('rejects transparent and empty values', () => {
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(normalizeColor('transparent')).toBeNull();
    expect(normalizeColor('currentcolor')).toBeNull();
    expect(normalizeColor('')).toBeNull();
  });

  it('keeps 6-digit hex with lowercase output', () => {
    expect(normalizeColor('#7C3AED')).toBe('#7c3aed');
  });
});

describe('stripNameHelperCalls', () => {
  it('rewrites standalone __name statements to their expression', () => {
    const source = 'function foo(){}__name(foo,"foo");return 1;';
    expect(stripNameHelperCalls(source)).toBe('function foo(){}foo;return 1;');
  });

  it('unwraps __name around arrow expressions', () => {
    const source = 'const toHex=__name(n=>Math.round(n).toString(16).padStart(2,"0"),"toHex");';
    const cleaned = stripNameHelperCalls(source);
    expect(cleaned).toContain('const toHex=n=>Math.round(n).toString(16).padStart(2,"0")');
    expect(cleaned).not.toContain('__name');
  });

  it('handles nested parentheses inside the wrapped expression', () => {
    const source = 'const x=__name((a)=>({v:(a*2).toFixed(1)}),"x");use(x);';
    const cleaned = stripNameHelperCalls(source);
    expect(cleaned).not.toContain('__name');
    expect(cleaned).toContain('const x=(a)=>({v:(a*2).toFixed(1)})');
  });

  it('the serialized collector is fully hermetic after stripping', () => {
    const cleaned = stripNameHelperCalls(collectThemeStats.toString());
    expect(cleaned).not.toContain('__name');
    expect(cleaned).toContain('normalizeHex');
    expect(cleaned).not.toContain('COLOR_KIND');
  });
});

describe('buildThemeManifest', () => {
  it('produces a valid manifest with role heuristics', () => {
    const manifest = buildThemeManifest(
      baseRaw(),
      'https://example.com',
      new Date('2026-08-17T12:00:00Z'),
    );
    expect(manifest.sourceUrl).toBe('https://example.com');
    expect(manifest.extractedAt).toBe('2026-08-17T12:00:00.000Z');

    const byRole = new Map(manifest.colors.map((c) => [c.role, c.hex]));
    expect(byRole.get('background')).toBe('#ffffff');
    expect(byRole.get('text')).toBe('#0f172a');
    expect(byRole.get('primary')).toBe('#7c3aed');

    expect(manifest.fonts[0].family).toBe('Inter');
    expect(manifest.fonts[0].weights).toEqual([400, 600]);
    expect(manifest.spacing.unit).toBe(8);
    expect(manifest.spacing.rhythm).toContain(24);
  });

  it('orders radii into small/medium/large', () => {
    const manifest = buildThemeManifest(baseRaw(), 'https://example.com');
    expect(manifest.borderRadius.small).toBe(4);
    expect(manifest.borderRadius.medium).toBe(8);
    expect(manifest.borderRadius.large).toBe(12);
  });

  it('sets sensible defaults for an empty page', () => {
    const raw = baseRaw();
    raw.colors = [];
    raw.fonts = [];
    raw.spacing = [];
    raw.borderRadius = [];
    raw.shadows = [];
    const manifest = buildThemeManifest(raw, 'https://example.com');
    expect(manifest.colors).toHaveLength(0);
    expect(manifest.spacing.unit).toBe(8);
    expect(manifest.borderRadius.large).toBe(0);
  });

  it('keeps brand assets absolute URLs', () => {
    const manifest = buildThemeManifest(baseRaw(), 'https://example.com/site');
    expect(manifest.brandAssets.logoUrl).toBe('https://example.com/logo.png');
    expect(manifest.brandAssets.faviconUrl).toBe('https://example.com/favicon.ico');
  });
});
