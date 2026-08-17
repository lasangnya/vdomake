import { chromium, type Browser, type Page } from 'playwright';
import path from 'node:path';
import { computeScrollPositions } from './scroll-plan';
import { extractRawTheme, buildThemeManifest } from './theme-extractor';
import type { ThemeManifest } from '@/types/theme';

export interface CaptureViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
}

export interface CaptureInput {
  url: string;
  viewports?: CaptureViewport[];
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  /** Abort signal honored between steps; in-flight page navigations finish first. */
  signal?: AbortSignal;
}

export type CaptureStage =
  'launching' | 'connecting' | 'scrolling' | 'capturing' | 'analyzing' | 'complete';

export interface CapturedFrameBuffer {
  buffer: Buffer;
  scrollPosition: number;
  order: number;
  viewport: CaptureViewport;
  metadata: { capturedAt: string; width: number; height: number };
}

export interface CaptureResult {
  frames: CapturedFrameBuffer[];
  manifest: ThemeManifest;
  pageTitle: string;
  finalUrl: string;
}

export const DEFAULT_VIEWPORT: CaptureViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
  isMobile: false,
};

export const VIEWPORT_PRESETS: Record<string, CaptureViewport> = {
  desktop: DEFAULT_VIEWPORT,
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  mobile: { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true },
};

const MAX_FRAMES = 40;
const NAVIGATION_TIMEOUT = 45_000;

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Capture aborted', 'AbortError');
  }
}

async function captureViewport(
  page: Page,
  input: CaptureInput,
  viewport: CaptureViewport,
  baseOrder: number,
  onProgress?: (stage: CaptureStage, current: number, total: number) => void,
): Promise<CapturedFrameBuffer[]> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(input.url, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT });
  // Let fonts and layout settle after network idle.
  await page.waitForTimeout(500);

  const pageHeight = Math.max(
    await page.evaluate(() => document.documentElement.scrollHeight),
    viewport.height,
  );
  const positions = computeScrollPositions({
    pageHeight,
    viewportHeight: viewport.height,
    maxFrames: MAX_FRAMES,
  });

  const frames: CapturedFrameBuffer[] = [];
  let lastShot: Buffer | null = null;
  const total = positions.length;

  for (let i = 0; i < positions.length; i += 1) {
    assertNotAborted(input.signal);
    const y = positions[i];
    await page.evaluate((scrollTo) => window.scrollTo(0, scrollTo), y);
    // Give the browser a frame to paint the new position.
    await page.waitForTimeout(120 + (i !== positions.length - 1 ? 0 : 400));

    const shot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: y, width: viewport.width, height: viewport.height },
    });

    if (lastShot && Buffer.compare(lastShot, shot) === 0) {
      continue; // Identical pixels — skip duplicate frame.
    }
    lastShot = shot;

    frames.push({
      buffer: shot,
      scrollPosition: y,
      order: baseOrder + frames.length,
      viewport,
      metadata: {
        capturedAt: new Date().toISOString(),
        width: viewport.width * viewport.deviceScaleFactor,
        height: viewport.height * viewport.deviceScaleFactor,
      },
    });
    onProgress?.('capturing', i + 1, total);
  }

  return frames;
}

/**
 * Launches a headless Chromium instance, navigates to the URL, captures
 * high-DPI full-page scroll frames per viewport, and extracts the theme
 * manifest from the desktop viewport. Returns in-memory buffers — persistence
 * is the caller's responsibility.
 */
export async function captureSite(
  input: CaptureInput,
  onProgress?: (stage: CaptureStage, current: number, total: number) => void,
): Promise<CaptureResult> {
  const viewports = input.viewports?.length ? input.viewports.slice(0, 3) : [DEFAULT_VIEWPORT];

  let browser: Browser | null = null;
  try {
    onProgress?.('launching', 0, 1);
    browser = await chromium.launch({ headless: true });
    assertNotAborted(input.signal);

    onProgress?.('connecting', 0, 1);
    const context = await browser.newContext({
      viewport: { width: viewports[0].width, height: viewports[0].height },
      deviceScaleFactor: viewports[0].deviceScaleFactor,
      isMobile: viewports[0].isMobile,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    });
    if (input.cookies?.length) {
      await context.addCookies(
        input.cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain ?? new URL(input.url).hostname,
          path: cookie.path ?? '/',
        })),
      );
    }

    const page = await context.newPage();
    const frames: CapturedFrameBuffer[] = [];

    for (let v = 0; v < viewports.length; v += 1) {
      assertNotAborted(input.signal);
      onProgress?.('scrolling', v + 1, viewports.length);
      const viewportFrames = await captureViewport(
        page,
        input,
        viewports[v],
        frames.length,
        onProgress,
      );
      frames.push(...viewportFrames);
    }

    onProgress?.('analyzing', 1, 1);
    // Theme extraction runs on the desktop viewport — ensure we're at the top.
    await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const raw = await extractRawTheme(page);
    const manifest = buildThemeManifest(raw, page.url());
    const pageTitle = await page.title();

    onProgress?.('complete', frames.length, frames.length);
    return { frames, manifest, pageTitle, finalUrl: page.url() };
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

export function extensionFor(format: 'png' | 'webp' = 'png'): string {
  return format === 'webp' ? 'webp' : 'png';
}

export function frameFilename(projectId: string, order: number): string {
  return path.join('screenshots', projectId, `frame-${String(order).padStart(4, '0')}.png`);
}
