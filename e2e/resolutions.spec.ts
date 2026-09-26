import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block' });

test('a formal resolution shows quorum live and records its next step when closed', async ({ page }) => {
  const log = await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^People/ }).click();
  await page.getByRole('menuitem', { name: 'Meetings' }).click();
  await page.getByRole('button', { name: /View Details/ }).first().click();
  await page.getByRole('tab', { name: /Voting/ }).click();

  // Open resolution: 7 of 10 marked present, 50% quorum = 5.
  await expect(page.getByText('7 present · quorum 5')).toBeVisible();
  // Closed one is a frozen minute.
  await expect(page.getByText('3 for · 1 against · 6 not voted · quorum 5 · 4 present')).toBeVisible();
  await expect(page.getByText('No quorum').first()).toBeVisible();

  await page.getByRole('button', { name: 'Close vote' }).first().click();
  await page.getByLabel('Next step').fill('Treasurer updates the debit orders');
  await page.getByLabel('Who').fill('Lindiwe');
  await page.getByRole('dialog').getByRole('button', { name: 'Close vote' }).click();

  await expect.poll(() => log.writes.find((w) => /\/votes\/v-open\/close$/.test(w.path))?.body)
    .toMatchObject({ nextStep: 'Treasurer updates the debit orders', nextStepOwner: 'Lindiwe' });
});
