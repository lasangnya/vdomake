import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * Storyboard flow: from a captured project, the storyboard page offers the
 * generate CTA; after a storyboard is saved (seeded via the tRPC save
 * endpoint — no LLM/API key required), the grid + preview render and scenes
 * can be edited. Requires Redis + Postgres (docker compose) and the worker to
 * produce screenshots.
 */
test.describe('storyboard flow', () => {
  let worker: ChildProcessWithoutNullStreams | undefined;
  let projectId: string;

  test.beforeAll(async () => {
    worker = spawn('bun', ['run', 'worker'], { stdio: 'pipe', shell: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('worker failed to start')), 30_000);
      worker?.stdout?.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('listening')) {
          clearTimeout(timer);
          resolve(null);
        }
      });
      worker?.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`worker exited early with code ${code}`));
      });
    });
  });

  test.afterAll(() => {
    worker?.kill('SIGTERM');
  });

  test('capture → generate CTA → seeded storyboard renders grid + preview', async ({ page }) => {
    const response = await page.request.post('/api/capture', {
      data: {
        url: 'http://127.0.0.1:3000',
        viewports: [{ width: 1280, height: 720, deviceScaleFactor: 2, isMobile: false }],
      },
    });
    expect(response.status()).toBe(202);
    const body = await response.json();
    projectId = body.data.projectId;

    // Wait for capture to complete (worker processes it).
    await page.waitForTimeout(8000);

    // Storyboard page shows the generate CTA (no storyboard yet, no provider key).
    await page.goto(`/projects/${projectId}/storyboard`);
    await expect(page.getByText(/Generate a storyboard from your screenshots/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/screenshots and a theme are ready/i)).toBeVisible();

    // Seed a storyboard via the tRPC save endpoint (no LLM involved).
    // No transformer is configured, so the batch payload carries raw input
    // keyed by index (no `{json}` envelope).
    const seed = await page.request.post(`/api/trpc/storyboard.save?batch=1`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        '0': {
          projectId,
          storyboard: {
            projectId,
            scenes: [
              {
                id: 'sc-1',
                order: 0,
                screenshotId: 'seed-shot',
                title: 'Hero scene',
                description: 'Opens the site',
                duration: 4,
                transition: { type: 'fade', duration: 0.6, easing: 'smooth' },
                camera: { type: 'static' },
                overlays: [],
              },
              {
                id: 'sc-2',
                order: 1,
                screenshotId: 'seed-shot',
                title: 'Feature scene',
                description: 'Highlights a feature',
                duration: 5,
                transition: { type: 'zoom', duration: 0.8, easing: 'spring' },
                camera: { type: 'zoom-to', target: { x: 50, y: 50, scale: 1.5 } },
                overlays: [],
              },
            ],
            version: 1,
            status: 'draft',
          },
        },
      },
    });
    expect(seed.status()).toBe(200);

    // Reload — the grid + preview should now render.
    await page.reload();
    await expect(page.getByText('Hero scene', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Feature scene', { exact: true })).toBeVisible();
    await expect(page.getByText(/2 scenes · drag to reorder/i)).toBeVisible();
    await expect(page.getByText('AI reasoning')).toBeVisible();

    // Save works (before opening the editor, which overlays the header button).
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });

    // Open the scene editor via edit action.
    await page.getByLabel('Edit Hero scene').click();
    await expect(page.getByText('Edit scene 1')).toBeVisible();
  });
});
