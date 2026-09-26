import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/mockApi';

test.use({ serviceWorkers: 'block', viewport: { width: 412, height: 915 } });

test('a new user creates a group in three steps', async ({ page }) => {
  const log = await mockApi(page, { newUser: true });
  await page.goto('/');

  // No demo group is created behind their back; they land on the wizard.
  await expect(page.getByRole('heading', { name: 'Let’s set up your group' })).toBeVisible();
  expect(log.writes.some((w) => w.path === '/demo-group')).toBe(false);

  await page.getByRole('radio', { name: /Rotating stokvel/ }).click();
  await page.getByLabel('Group name').fill('Masakhane Umgalelo');
  await page.getByLabel(/Each member pays/).fill('1200');
  await page.getByRole('button', { name: 'Next: add members' }).click();
  await page.getByLabel('Members').fill('Thandi Mokoena\nSipho Dlamini\nThandi Mokoena');
  await expect(page.getByText('2 other members listed.')).toBeVisible();
  await page.getByRole('button', { name: 'Create group' }).click();

  // Straight to the new group's dashboard.
  await expect(page.getByText('Collected this round')).toBeVisible({ timeout: 10_000 });

  const create = log.writes.find((w) => w.method === 'POST' && w.path === '/groups');
  expect(create?.body).toMatchObject({ name: 'Masakhane Umgalelo', groupType: 'rotating', contributionTarget: 1200 });
  const added = log.writes.filter((w) => w.path.endsWith('/members/managed')).map((w) => (w.body as { name: string }).name);
  expect(added).toEqual(['Thandi Mokoena', 'Sipho Dlamini']);
  expect(log.writes.some((w) => w.path.endsWith('/rotation/init'))).toBe(true);
});

test('the sample group is opt-in', async ({ page }) => {
  const log = await mockApi(page, { newUser: true });
  await page.goto('/');
  await page.getByRole('button', { name: /Explore a sample group/ }).click();
  await expect.poll(() => log.writes.some((w) => w.path === '/demo-group')).toBe(true);
});
