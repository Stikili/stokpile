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

  test('Sign In opens a popup over the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Welcome to Stokpile')).toBeVisible({ timeout: 5000 });
    // The landing page is still underneath — no navigation happened.
    await expect(page.locator('h1', { hasText: 'Run your stokvel the modern way' }).first()).toBeAttached();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('Start Free opens the popup on sign-up', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Start Free/i }).first().click();
    await expect(page.getByRole('dialog').getByLabel(/First Name/i)).toBeVisible({ timeout: 5000 });
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
