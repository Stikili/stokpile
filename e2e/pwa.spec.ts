import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('has manifest link', async ({ page }) => {
    await page.goto('/');
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', '/manifest.json');
  });

  test('manifest.json is valid', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.name).toContain('Stokpile');
    expect(json.icons).toBeDefined();
    expect(json.icons.length).toBeGreaterThan(0);
    expect(json.start_url).toBe('/');
    expect(json.display).toBe('standalone');
  });

  test('has apple-touch-icon', async ({ page }) => {
    await page.goto('/');
    const icon = page.locator('link[rel="apple-touch-icon"]');
    await expect(icon).toHaveAttribute('href', '/apple-touch-icon.png');
  });

  test('has viewport-fit=cover for iOS safe areas', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    const content = await viewport.getAttribute('content');
    expect(content).toContain('viewport-fit=cover');
  });

  test('icons are accessible', async ({ page }) => {
    const icon192 = await page.goto('/icon-192.png');
    expect(icon192?.status()).toBe(200);
    const icon512 = await page.goto('/icon-512.png');
    expect(icon512?.status()).toBe(200);
  });
});
