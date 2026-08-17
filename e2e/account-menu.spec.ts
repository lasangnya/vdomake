import { expect, test } from '@playwright/test';

test('account dropdown opens without MenuGroup error', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();

  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Feedback' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();

  const menuErrors = errors.filter((e) => !/browser extension/i.test(e));
  expect(menuErrors).toEqual([]);
});
