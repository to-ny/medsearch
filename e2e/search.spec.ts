import { test, expect } from '@playwright/test';

test('search from home returns results with clickable links', async ({ page }) => {
  await page.goto('/en');

  const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="earch"]').first();
  await searchInput.fill('paracetamol');
  await searchInput.press('Enter');

  await expect(page).toHaveURL(/\/search/);
  await expect(page.locator('main')).toContainText(/parac[eé]tamol/i);
  await expect(page.locator('a[href*="/substances/"], a[href*="/generics/"], a[href*="/medications/"]').first()).toBeVisible();
});

test('search by ATC code finds classification', async ({ page }) => {
  await page.goto('/en/search?q=C10AA05');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('main')).toContainText(/C10AA05|Atorvastatin/i);
  await expect(page.locator('a[href*="/classifications/"]').first()).toBeVisible();
});

test('search by company name finds company', async ({ page }) => {
  await page.goto('/en/search?q=Boiron');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('a[href*="/companies/"]').first()).toBeVisible();
});

test('search with no results shows message', async ({ page }) => {
  await page.goto('/en/search?q=xyznonexistent98765');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('main')).toContainText(/no results|geen resultaten|aucun résultat|not found/i);
});
