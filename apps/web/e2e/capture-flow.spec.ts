import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * Full capture workflow: create a project from a URL → progress streams →
 * screenshots + theme preview render. Requires Redis + Postgres (docker
 * compose) and the capture worker. This handles starting/stopping the worker
 * itself so it does not depend on Playwright's webServer (which only runs the
 * Next app).
 */
test.describe('capture flow', () => {
  let worker: ChildProcessWithoutNullStreams | undefined;
  let projectId: string;

  test.beforeAll(async () => {
    worker = spawn('npm', ['run', 'worker'], { stdio: 'pipe', shell: true });
    // Wait for the worker to connect to Redis and start listening.
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

  test('captures localhost, streams progress, and shows theme', async ({ page }) => {
    // Start a capture of our own app via the API.
    const response = await page.request.post('/api/capture', {
      data: {
        url: 'http://127.0.0.1:3000',
        viewports: [{ width: 1280, height: 720, deviceScaleFactor: 2, isMobile: false }],
      },
    });
    expect(response.status()).toBe(202);
    const body = await response.json();
    projectId = body.data.projectId;
    expect(projectId).toBeTruthy();

    // Navigate to the capture page with the job id — it should resolve to either
    // an in-progress card or (for a fast local capture) straight to the review.
    await page.goto(`/projects/${projectId}/capture?job=${body.data.jobId}`);

    // The capture must eventually reach the review state with screenshots + theme.
    await expect(page.locator('img[alt^="Screenshot"]').first()).toBeVisible({ timeout: 120_000 });

    // Theme manifest surfaced: colors + fonts sections present.
    await expect(page.getByText('Colors', { exact: true })).toBeVisible();
    await expect(page.getByText('Typography', { exact: true })).toBeVisible();

    // Data persisted server-side.
    const projectRes = await page.request.get(`/api/projects/${projectId}`);
    const projectBody = await projectRes.json();
    expect(projectBody.data.status).toBe('captured');
    expect(projectBody.data.captures.length).toBeGreaterThanOrEqual(1);
    expect(projectBody.data.themeManifest).not.toBeNull();
  });
});
