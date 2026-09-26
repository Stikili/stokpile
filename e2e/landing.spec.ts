import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('leads with the tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Nobody’s turn gets forgotten.' })).toBeVisible();
  });

  test('hero shows a round in progress, not a balance', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: 'Round 7 of 10' })).toBeVisible();
    await expect(page.getByText('Collected this round')).toBeVisible();
  });

  test('has Sign In and Start Free', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start free' }).first()).toBeVisible();
  });

  test('Sign In opens a popup over the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Welcome to Stokpile')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1', { hasText: 'Nobody’s turn gets forgotten.' })).toBeAttached();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('Start your group opens the popup on sign-up', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start your group' }).first().click();
    await expect(page.getByRole('dialog').getByLabel(/First Name/i)).toBeVisible({ timeout: 5000 });
  });

  test('has theme toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /theme/i })).toBeVisible();
  });

  test('pricing is per group, and rewards sit below it', async ({ page }) => {
    await page.goto('/');
    const pricing = page.getByRole('heading', { name: 'Priced per group, not per person' });
    const rewards = page.getByRole('heading', { name: 'Stokpile pays you back' });
    await expect(pricing).toBeVisible();
    const [p, r] = await Promise.all([pricing.boundingBox(), rewards.boundingBox()]);
    expect(r!.y).toBeGreaterThan(p!.y);
  });

  test('Pilo is described as included per plan, not free', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/5 questions a month on Free, 30 on Starter, 200 on Pro/)).toBeVisible();
  });

  test('country band', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('South Africa').first()).toBeVisible();
    await expect(page.getByText('+ 10 more')).toBeVisible();
  });
});
