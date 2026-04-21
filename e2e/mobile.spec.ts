import { test, expect, devices } from '@playwright/test';

// Mobile viewport regression tests. Landing page renders a parallel set
// of mobile-only elements (md:hidden) that don't appear on desktop viewports.
// Uses Pixel 7 because its browser is Chromium (already installed in CI).

test.use({ ...devices['Pixel 7'] });

test.describe('Mobile Landing Page', () => {
  test('hero and Sign In button are visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h1:visible', { hasText: 'Run your stokvel the modern way' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('mobile sticky CTA bar is visible at the bottom', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Get Started Free/i }).first(),
    ).toBeVisible();
  });

  test('mobile rewards section renders', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2:visible', { hasText: 'Stokpile pays you back' }),
    ).toBeVisible();
  });

  test('mobile features section renders', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2:visible', { hasText: 'Everything your group needs' }),
    ).toBeVisible();
  });

  test('mobile pricing section renders', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('h2:visible', { hasText: 'Honest African pricing' }),
    ).toBeVisible();
  });
});
