import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block' });

test('a recorded payment has a shareable receipt', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Record a payment' }).click();

  await page.getByRole('button', { name: 'Receipt' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/^STK-\d{4}-[A-Z0-9]{4}$/)).toBeVisible();
  await expect(dialog.getByText('Masakhane Umgalelo')).toBeVisible();
  await expect(dialog.getByText(/^Round 7 \/ 10/)).toBeVisible();
  await expect(dialog.getByText('Recorded')).toBeVisible();

  // No share sheet in a headless browser, so the image is saved instead.
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Share receipt image' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^STK-\d{4}-[A-Z0-9]{4}\.png$/);
  if (process.env.RECEIPT_PNG) await file.saveAs(process.env.RECEIPT_PNG);
});
