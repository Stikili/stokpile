import { test, expect } from '@playwright/test';

// The landing page renders mobile and desktop variants in parallel (one is
// `md:hidden`, the other `hidden md:block`). Tests scope to visible elements
// so they're deterministic on the default desktop viewport.

test.describe('Landing Page', () => {
  test('displays hero headline', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h1:visible', { hasText: 'Run your stokvel the modern way' }),
    ).toBeVisible();
  });

  test('has Sign In button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('has Start Free CTA', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Start Free/i }).first(),
    ).toBeVisible();
  });

  test('clicking Sign In shows auth form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Welcome to Stokpile')).toBeVisible({ timeout: 5000 });
  });

  test('has theme toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /theme/i })).toBeVisible();
  });

  test('displays pricing section', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2:visible', { hasText: 'Honest African pricing' }),
    ).toBeVisible();
  });

  test('displays rewards section', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2:visible', { hasText: 'Stokpile pays you back' }),
    ).toBeVisible();
  });

  test('displays country strip', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('South Africa').first()).toBeVisible();
  });
});
