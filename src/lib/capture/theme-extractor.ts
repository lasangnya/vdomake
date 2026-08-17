import type { Page } from 'playwright';
import { themeManifestSchema } from '@/lib/validators/theme-manifest.schema';
import type { ThemeManifest } from '@/types/theme';

/**
 * Raw computed-style statistics collected from the page. This is a plain,
 * JSON-serializable shape so it can travel across the browser boundary and be
 * unit-tested without a browser.
 */
export interface RawThemeData {
  colors: Array<{ hex: string; count: number; kind: 'bg' | 'text' | 'border' | 'other' }>;
  fonts: Array<{ family: string; count: number; weights: number[]; sizes: number[] }>;
  spacing: number[];
  borderRadius: number[];
  shadows: Array<{ color: string; blur: number; offsetX: number; offsetY: number }>;
  logoUrls: string[];
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

function normalizeColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (
    !trimmed ||
    trimmed === TRANSPARENT ||
    trimmed === 'transparent' ||
    trimmed === 'currentcolor'
  ) {
    return null;
  }
  // Accept products of the page's own CSS custom properties or named colors
  // that we cannot cheaply convert — fall back to rgb() parsing.
  if (trimmed.startsWith('rgb')) {
    const match = trimmed.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()));
    const [r = 0, g = 0, b = 0, a = 1] = parts;
    if (a === 0) return null;
    const toHex = (n: number) =>
      Math.round(Math.min(Math.max(n, 0), 255))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  if (HEX_RE.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
  }
  return null;
}

const COLOR_KIND: Record<string, 'bg' | 'text' | 'border' | 'other'> = {
  'background-color': 'bg',
  color: 'text',
  'border-color': 'border',
  'border-top-color': 'border',
  'border-right-color': 'border',
  'border-bottom-color': 'border',
  'border-left-color': 'border',
  background: 'bg',
};

function collectThemeStats(): RawThemeData {
  const colorCounts = new Map<
    string,
    { count: number; kind: 'bg' | 'text' | 'border' | 'other' }
  >();
  const fontCounts = new Map<string, { count: number; weights: Set<number>; sizes: Set<number> }>();
  const spacingSet = new Set<number>();
  const radiusSet = new Set<number>();
  const shadowSet = new Set<string>();

  const recordColor = (raw: string, kind: 'bg' | 'text' | 'border' | 'other') => {
    const hex = normalizeColor(raw);
    if (!hex) return;
    const entry = colorCounts.get(hex) ?? { count: 0, kind };
    entry.count += 1;
    if (kind === 'bg' || entry.kind === 'other') entry.kind = kind;
    colorCounts.set(hex, entry);
  };

  const all = document.querySelectorAll('*');
  for (const el of all) {
    const style = window.getComputedStyle(el);
    if (style === null) continue;

    const background = style.backgroundColor;
    if (background) recordColor(background, 'bg');
    const backgroundImage = style.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && backgroundImage.includes('gradient')) {
      const stops = backgroundImage.match(/rgba?\([^)]+\)/g) ?? [];
      for (const stop of stops) recordColor(stop, 'bg');
    }
    const color = style.color;
    if (color) recordColor(color, 'text');
    for (const prop of [
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
    ] as const) {
      const border = style[prop];
      if (border) recordColor(border, 'border');
    }

    const fontFamily = style.fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') ?? 'system';
    if (fontFamily !== 'inherit') {
      const fontEntry = fontCounts.get(fontFamily) ?? {
        count: 0,
        weights: new Set<number>(),
        sizes: new Set<number>(),
      };
      fontEntry.count += 1;
      const weight = Number.parseInt(style.fontWeight, 10);
      if (Number.isFinite(weight)) fontEntry.weights.add(weight);
      const size = Number.parseFloat(style.fontSize);
      if (Number.isFinite(size)) fontEntry.sizes.add(Math.round(size));
      fontCounts.set(fontFamily, fontEntry);
    }

    const radius = Number.parseFloat(style.borderTopLeftRadius);
    if (Number.isFinite(radius) && radius > 0) radiusSet.add(Math.round(radius));
    const spacingProps = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'] as const;
    for (const prop of spacingProps) {
      const value = Number.parseFloat(style[prop]);
      if (Number.isFinite(value) && value > 0) spacingSet.add(Math.round(value));
    }
    const boxShadow = style.boxShadow;
    if (boxShadow && boxShadow !== 'none') shadowSet.add(boxShadow);
  }

  const shadows = [...shadowSet].slice(0, 12).map((shadow) => {
    const color = (shadow.match(/rgba?\([^)]+\)/) ?? [])[0] ?? '#000000';
    const numbers = shadow.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    return {
      color: normalizeColor(color) ?? '#000000',
      blur: Math.round(numbers[2] ?? 0),
      offsetX: Math.round(numbers[0] ?? 0),
      offsetY: Math.round(numbers[1] ?? 0),
    };
  });

  const logoUrls: string[] = [];
  const headerLogo = document.querySelector(
    'header img, [role="banner"] img, .logo img, img[alt*="logo" i]',
  );
  if (
    headerLogo instanceof HTMLImageElement &&
    headerLogo.src &&
    !headerLogo.src.startsWith('data:')
  ) {
    logoUrls.push(headerLogo.src);
  }
  const favicon =
    (
      document.querySelector(
        'link[rel="icon"], link[rel="shortcut icon"]',
      ) as HTMLLinkElement | null
    )?.href ??
    (document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null)?.href ??
    null;
  const ogImage =
    (document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)?.content ??
    null;

  const abs = (value: string | null) => {
    if (!value) return null;
    try {
      return new URL(value, window.location.href).href;
    } catch {
      return value;
    }
  };

  return {
    colors: [...colorCounts.entries()]
      .map(([hex, entry]) => ({ hex, count: entry.count, kind: entry.kind }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 48),
    fonts: [...fontCounts.entries()]
      .map(([family, entry]) => ({
        family,
        count: entry.count,
        weights: [...entry.weights].sort((a, b) => a - b),
        sizes: [...entry.sizes].sort((a, b) => a - b).slice(0, 12),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    spacing: [...spacingSet].sort((a, b) => a - b).slice(0, 24),
    borderRadius: [...radiusSet].sort((a, b) => a - b).slice(0, 12),
    shadows,
    logoUrls: logoUrls.slice(0, 3),
    faviconUrl: abs(favicon),
    ogImageUrl: abs(ogImage),
  };
}

/** Runs the collector inside the page and returns the raw stats. */
export async function extractRawTheme(page: Page): Promise<RawThemeData> {
  return page.evaluate(collectThemeStats);
}

/**
 * Turns raw page statistics into a validated ThemeManifest. Pure — all logic
 * is testable without a browser.
 */
export function buildThemeManifest(
  raw: RawThemeData,
  sourceUrl: string,
  extractedAt = new Date(),
): ThemeManifest {
  const byKind = (kind: RawThemeData['colors'][number]['kind']) =>
    raw.colors.filter((c) => c.kind === kind).map((c) => c.hex);

  const backgroundHex = byKind('bg')[0] ?? '#ffffff';
  const textHex = byKind('text')[0] ?? '#000000';
  const accentCandidates = raw.colors.filter(
    (c) =>
      c.kind !== 'bg' &&
      c.kind !== 'text' &&
      !isLowContrastPair(textHex, c.hex) &&
      c.hex !== backgroundHex,
  );
  const primary = accentCandidates[0]?.hex ?? byKind('border')[0] ?? textHex;

  const roleFor = (hex: string): ThemeManifest['colors'][number]['role'] => {
    if (hex === backgroundHex) return 'background';
    if (hex === textHex) return 'text';
    if (hex === primary) return 'primary';
    const usage = raw.colors.find((c) => c.hex === hex)?.count ?? 0;
    return usage > 2 ? 'accent' : 'other';
  };

  const sortedRadii = raw.borderRadius.slice().sort((a, b) => a - b);
  if (sortedRadii.length === 0) sortedRadii.push(0);
  const medianRadius = sortedRadii[Math.floor(sortedRadii.length / 2)] ?? 0;

  const manifest = {
    colors: raw.colors.slice(0, 8).map((c) => ({
      hex: c.hex,
      role: roleFor(c.hex),
      usage: c.count,
    })),
    fonts: raw.fonts.slice(0, 4).map((f) => ({
      family: f.family,
      weights: f.weights,
      sizes: f.sizes,
      usage: f.count,
    })),
    spacing: {
      unit: spacingBase(raw.spacing),
      rhythm: raw.spacing.slice(0, 12),
    },
    borderRadius: {
      small: sortedRadii[0] ?? 0,
      medium: medianRadius,
      large: sortedRadii.at(-1) ?? 0,
    },
    shadows: raw.shadows,
    brandAssets: {
      logoUrl: raw.logoUrls[0],
      faviconUrl: raw.faviconUrl ?? undefined,
      ogImageUrl: raw.ogImageUrl ?? undefined,
    },
    sourceUrl,
    extractedAt: extractedAt.toISOString(),
  };

  return themeManifestSchema.parse(manifest);
}

function spacingBase(values: number[]): number {
  const frequent = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (frequent.length === 0) return 8;
  const counts = new Map<number, number>();
  for (const value of frequent) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? frequent[0];
}

function isLowContrastPair(a: string, b: string): boolean {
  const lum = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  return Math.abs(lum(a) - lum(b)) < 0.15;
}

export { collectThemeStats, normalizeColor, COLOR_KIND };
