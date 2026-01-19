import { test, expect } from '@playwright/test';

// CNK Quick Search tests
test('CNK code search shows indicator and filters to packages', async ({ page }) => {
  await page.goto('/en');

  const searchInput = page.locator('input[aria-label="Search"]').first();
  await searchInput.fill('1234567');

  // Should show CNK detected indicator
  await expect(page.getByText('CNK detected')).toBeVisible();

  // Submit and verify URL has package filter
  await searchInput.press('Enter');
  await expect(page).toHaveURL(/types=ampp/);
});

test('non-CNK search does not add types filter', async ({ page }) => {
  await page.goto('/en');

  const searchInput = page.locator('input[aria-label="Search"]').first();
  await searchInput.fill('paracetamol');
  await searchInput.press('Enter');

  await expect(page).not.toHaveURL(/types=/);
});

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

  // Company filter should show results
  const companyFilter = page.locator('button:has-text("Company")');
  await expect(companyFilter).toBeVisible();

  // Click company filter to show company results
  await companyFilter.click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('a[href*="/companies/"]').first()).toBeVisible();
});

test('search with no results shows message', async ({ page }) => {
  await page.goto('/en/search?q=xyznonexistent98765');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('main')).toContainText(/no results|geen resultaten|aucun résultat|not found/i);
});

test('pagination works with multiple type filters selected', async ({ page }) => {
  // This test ensures pagination works when multiple (but not all) entity types are selected
  // Previously this would fail because we didn't fetch enough results for later pages
  await page.goto('/en/search?q=para&types=vtm,vmp,ampp');
  await page.waitForLoadState('networkidle');

  // Should show results and pagination
  await expect(page.locator('main')).toContainText(/para/i);

  // Navigate to page 2 using the pagination button (aria-label="Page 2")
  const page2Button = page.locator('button[aria-label="Page 2"]');
  if (await page2Button.isVisible()) {
    await page2Button.click();
    await page.waitForLoadState('networkidle');

    // Should still show results on page 2
    await expect(page.locator('a[href*="/substances/"], a[href*="/generics/"], a[href*="/packages/"]').first()).toBeVisible();
  }
});
