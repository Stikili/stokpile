import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block', viewport: { width: 412, height: 915 } });

test.describe('Mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
  });

  test('tab bar reads Home · Money · Pilo · Members · Meet, with words under icons', async ({ page }) => {
    for (const name of ['Home', 'Money', 'Ask Pilo', 'Members', 'Meet']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('Money covers contributions and payouts via the switcher', async ({ page }) => {
    await page.getByRole('button', { name: 'Money', exact: true }).click();
    const tabs = page.getByRole('tablist', { name: 'Section' }).first();
    await expect(tabs.getByRole('tab', { name: 'Contributions' })).toHaveAttribute('aria-selected', 'true');
    await tabs.getByRole('tab', { name: 'Payouts' }).click();
    await expect(page.getByRole('button', { name: 'Money', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('Members lists the group', async ({ page }) => {
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Members (10)' })).toBeVisible();
    await expect(page.getByText('Thandi Mokoena')).toBeVisible();
  });

  test('drawer groups every screen by section', async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click();
    for (const heading of ['Money', 'People', 'More']) {
      await expect(page.getByRole('dialog').getByText(heading, { exact: true })).toBeVisible();
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByRole('tab', { name: 'Insights' }).first()).toHaveAttribute('aria-selected', 'true');
  });
});
