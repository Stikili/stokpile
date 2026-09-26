import { test, expect, devices } from '@playwright/test';

// Mobile viewport regression tests. Uses Pixel 7 (Chromium).
test.use({ ...devices['Pixel 7'] });

test.describe('Mobile Landing Page', () => {
  test('hero and sign-in are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Nobody’s turn gets forgotten.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('no sticky call-to-action bar covers the page', async ({ page }) => {
    await page.goto('/');
    const fixedBottom = await page.evaluate(() =>
      [...document.querySelectorAll('body *')].filter((el) => {
        const s = getComputedStyle(el);
        return s.position === 'fixed' && s.bottom === '0px' && el.getBoundingClientRect().height > 0;
      }).length,
    );
    expect(fixedBottom).toBe(0);
  });

  test('sections render', async ({ page }) => {
    await page.goto('/');
    for (const name of ['How a cycle works', 'What the treasurer stops doing', 'Priced per group, not per person', 'Questions groups ask']) {
      await expect(page.getByRole('heading', { name })).toBeAttached();
    }
  });
});
