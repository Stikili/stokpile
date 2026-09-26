import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

// Logged-in dashboard against a mocked API (no backend needed).
test.use({ serviceWorkers: 'block' });

test.describe('Dashboard — rotating group', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
  });

  test('shows the round, not a balance', async ({ page }) => {
    await expect(page.getByText('Round 7 of 10', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: 'Round 7 of 10' })).toBeVisible();
    await expect(page.getByText('Collected this round')).toBeVisible();
    await expect(page.getByText('Group balance')).toHaveCount(0);
  });

  test('lists late members first with a Late chip', async ({ page }) => {
    const firstRow = page.locator('.ledger-row').first();
    await expect(firstRow).toContainText('Late');
    await expect(page.getByText('7/10 paid')).toBeVisible();
  });

  test('primary action opens contributions', async ({ page }) => {
    await page.getByRole('button', { name: 'Record a payment' }).click();
    await expect(page.getByRole('heading', { name: /contributions/i }).first()).toBeVisible();
  });

  test('admin tools live behind one menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Group tools' }).click();
    await expect(page.getByRole('menuitem', { name: /Share summary image/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Growth audit/ })).toBeVisible();
  });
});

test('non-rotating group shows group funds instead of a round', async ({ page }) => {
  await mockApi(page, { groupType: 'burial' });
  await page.goto('/');
  await expect(page.getByText('Group funds')).toBeVisible();
  await expect(page.getByRole('img', { name: /Round \d+ of/ })).toHaveCount(0);
});
