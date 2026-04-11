import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('displays hero headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Run your stokvel the modern way');
  });

  test('has Sign In button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('has Start Free CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Start Free/i })).toBeVisible();
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
    // Desktop pricing
    const pricing = page.getByText('Honest African pricing');
    // At least one visible (mobile or desktop)
    await expect(pricing.first()).toBeVisible();
  });

  test('displays country strip', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('South Africa').first()).toBeVisible();
  });
});
