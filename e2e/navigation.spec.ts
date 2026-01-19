import { test, expect } from '@playwright/test';

test('entity hierarchy: VTM → VMP → AMP → AMPP', async ({ page }) => {
  // Start at VTM (substance) - paracetamol
  await page.goto('/en/substances/974');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toContainText(/parac[eé]tamol/i);

  // Navigate to a VMP (generic product)
  const vmpLink = page.locator('a[href*="/generics/"]').first();
  await expect(vmpLink).toBeVisible({ timeout: 10000 });
  await vmpLink.click();
  await expect(page).toHaveURL(/\/generics\//);

  // Navigate to an AMP (brand medication)
  const ampLink = page.locator('a[href*="/medications/"]').first();
  await expect(ampLink).toBeVisible({ timeout: 10000 });
  await ampLink.click();
  await expect(page).toHaveURL(/\/medications\//);

  // Navigate to an AMPP (package)
  const amppLink = page.locator('a[href*="/packages/"]').first();
  await expect(amppLink).toBeVisible({ timeout: 10000 });
  await amppLink.click();
  await expect(page).toHaveURL(/\/packages\//);
});

test('404 for invalid routes', async ({ page }) => {
  const response = await page.goto('/en/invalid-route-xyz-12345');
  expect(response?.status()).toBe(404);
});
