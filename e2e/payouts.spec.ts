import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block' });

test('a second admin signs before a payout can be released', async ({ page }) => {
  const log = await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Money/ }).click();
  await page.getByRole('menuitem', { name: 'Payouts' }).click();

  await expect(page.getByText('1 of 2 signed')).toBeVisible();
  // Not releasable yet: only the scheduling admin has signed.
  await expect(page.getByRole('button', { name: 'Release' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect.poll(() => log.writes.some((w) => w.method === 'POST' && /\/payouts\/p-next\/approve$/.test(w.path))).toBe(true);
});
