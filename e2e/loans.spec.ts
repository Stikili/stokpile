import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block' });

test('a chama keeps a loan book: late loans flagged, a second admin releases a request', async ({ page }) => {
  const log = await mockApi(page, { groupType: 'chama' });
  await page.goto('/');
  await page.getByRole('button', { name: /^Money/ }).click();
  await page.getByRole('menuitem', { name: 'Loans' }).click();

  await expect(page.getByText('10% flat')).toBeVisible();
  // 18 000 at 10% = 19 800 due, 3 300 repaid → 16 500 owed back.
  await expect(page.getByText('R16 500').first()).toBeVisible();
  await expect(page.getByText('1 late')).toBeVisible();
  await expect(page.getByText(/School fees · 1 of 6 · \d+ days late/)).toBeVisible();
  await expect(page.getByText('Stock · 1 of 2 signatures')).toBeVisible();

  await page.getByText('Stock · 1 of 2 signatures').click();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect.poll(() => log.writes.some((w) => w.method === 'POST' && /\/loans\/loan-req\/approve$/.test(w.path))).toBe(true);
});

test('groups that don’t lend have no loan book', async ({ page }) => {
  await mockApi(page, { groupType: 'rotating' });
  await page.goto('/');
  await page.getByRole('button', { name: /^Money/ }).click();
  await expect(page.getByRole('menuitem', { name: 'Loans' })).toHaveCount(0);
});
