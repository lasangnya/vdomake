import { test, expect } from '@playwright/test';

/**
 * Voiceover & keyframe flow: from a captured + storyboarded project, the
 * audio page offers the upload UI; after a track is seeded (via the tRPC
 * saveTrack endpoint — no Whisper/API key required), the waveform, transcript,
 * timing table render, and auto-sync produces keyframes from the transcript.
 */
test.describe('audio sync flow', () => {
  let projectId: string;

  const seedTrackPayload = () => ({
    '0': {
      projectId,
      track: {
        fileUrl: `/api/files/audio/${projectId}/voice.mp3`,
        duration: 12,
        transcript: {
          text: 'Welcome to our dashboard. Manage projects and settings here. Sign up today.',
          language: 'en',
          segments: [
            {
              id: 0,
              text: 'Welcome to our dashboard',
              start: 0,
              end: 3,
              words: [
                { word: 'Welcome', start: 0, end: 0.8 },
                { word: 'to', start: 0.9, end: 1.1 },
                { word: 'our', start: 1.2, end: 1.4 },
                { word: 'dashboard', start: 1.5, end: 3 },
              ],
            },
            {
              id: 1,
              text: 'Manage projects and settings here',
              start: 4,
              end: 8,
              words: [],
            },
            {
              id: 2,
              text: 'Sign up today',
              start: 10,
              end: 12,
              words: [],
            },
          ],
        },
      },
    },
  });

  test('capture → storyboard seed → audio page renders transcript + auto-sync', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // Create a project and wait for capture to complete.
    const response = await page.request.post('/api/capture', {
      data: {
        url: 'http://127.0.0.1:3000',
        viewports: [{ width: 1280, height: 720, deviceScaleFactor: 2, isMobile: false }],
      },
    });
    expect(response.status()).toBe(202);
    const body = await response.json();
    projectId = body.data.projectId;
    await page.waitForTimeout(8000);

    // Seed a storyboard so scenes exist for auto-sync.
    const sbSeed = await page.request.post('/api/trpc/storyboard.save?batch=1', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        '0': {
          projectId,
          storyboard: {
            projectId,
            scenes: [
              {
                id: 'sc-dashboard',
                order: 0,
                screenshotId: 'seed',
                title: 'Dashboard',
                description: 'manage projects',
                duration: 4,
                transition: { type: 'fade', duration: 0.6, easing: 'smooth' },
                camera: { type: 'static' },
                overlays: [],
              },
              {
                id: 'sc-signup',
                order: 1,
                screenshotId: 'seed',
                title: 'Sign up',
                description: 'get started',
                duration: 4,
                transition: { type: 'fade', duration: 0.6, easing: 'smooth' },
                camera: { type: 'static' },
                overlays: [],
              },
            ],
            version: 1,
            status: 'draft',
          },
        },
      },
    });
    expect(sbSeed.status()).toBe(200);

    // The audio page shows the upload UI (no track yet).
    await page.goto(`/projects/${projectId}/audio`);
    await expect(page.getByText(/Upload your voiceover/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Drag & drop your voiceover/i)).toBeVisible();

    // Seed an audio track via the tRPC saveTrack endpoint.
    const trackSeed = await page.request.post('/api/trpc/audio.saveTrack?batch=1', {
      headers: { 'Content-Type': 'application/json' },
      data: seedTrackPayload(),
    });
    expect(trackSeed.status()).toBe(200);

    // Reload — the transcript, timing table, and controls appear.
    await page.reload();
    await expect(page.getByText('Transcript')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Welcome to our dashboard')).toBeVisible();
    await expect(page.getByText('Scene timing')).toBeVisible();
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Auto-sync scenes/i })).toBeVisible();

    // Auto-sync produces keyframes from the transcript.
    await page.getByRole('button', { name: /Auto-sync scenes/i }).click();
    await expect(page.getByText(/keyframes? suggested/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('00:00.0').first()).toBeVisible();
  });
});
