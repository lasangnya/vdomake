import { expect, test } from '@playwright/test';

test.describe('VDOMake smoke', () => {
  test('landing page renders hero and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Paste a URL/i })).toBeVisible();
    await expect(page.getByText('Get a video.', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: /Start a project/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Configure providers/i })).toBeVisible();
  });

  test('landing page shows the five pipeline phases', async ({ page }) => {
    await page.goto('/');
    for (const phase of ['Capture', 'Storyboard', 'Voiceover', 'Generate', 'Export']) {
      await expect(page.getByText(phase, { exact: true })).toBeVisible();
    }
  });

  test('projects page shows empty state and provider gate', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('No projects yet')).toBeVisible();
    await expect(page.getByText(/Connect an AI provider/i)).toBeVisible();
  });

  test('settings page renders provider cards', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('OpenAI', { exact: true })).toBeVisible();
    await expect(page.getByText('Anthropic', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Gemini', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Task Routing' })).toBeVisible();
  });

  test('settings routing tab shows the task table', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Task Routing' }).click();
    await expect(page.getByText('Vision Analysis')).toBeVisible();
    await expect(page.getByText('Storyboard Gen')).toBeVisible();
    await expect(page.getByText('Transcription')).toBeVisible();
  });
});
