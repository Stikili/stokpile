import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?signin=1');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByText('Welcome to Stokpile')).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test('shows sign up form when toggled', async ({ page }) => {
    await page.getByText("Don't have an account? Sign up").click();
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByLabel(/First Name/i)).toBeVisible();
    await expect(page.getByLabel(/Surname/i)).toBeVisible();
    await expect(page.getByLabel(/Country/i)).toBeVisible();
  });

  test('sign up requires consent checkbox', async ({ page }) => {
    await page.getByText("Don't have an account? Sign up").click();
    // Sign Up button should be disabled without consent
    const signUpBtn = page.getByRole('button', { name: 'Sign Up' });
    await expect(signUpBtn).toBeDisabled();
  });

  test('shows validation on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    // Browser validation prevents submission on required fields
    // Check the email field has required attribute
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('has forgot password link', async ({ page }) => {
    await expect(page.getByText(/Forgot/i)).toBeVisible();
  });

  test('has theme toggle on auth page', async ({ page }) => {
    // ThemeToggle is rendered on the auth form
    const themeButtons = page.locator('[aria-label*="theme"]');
    await expect(themeButtons.first()).toBeVisible();
  });
});
