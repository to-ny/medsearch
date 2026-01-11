import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page with navigation cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Belgian Medication Search');
    await expect(page.getByRole('heading', { name: 'Search Medications' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Compare Prices' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Browse Companies' })).toBeVisible();
  });

  test('should navigate to main sections', async ({ page }) => {
    await page.goto('/');

    // Navigate to search
    await page.getByRole('link', { name: /Search Medications/i }).click();
    await expect(page).toHaveURL('/search');

    // Navigate back and go to companies
    await page.goto('/');
    await page.getByRole('link', { name: /Browse Companies/i }).click();
    await expect(page).toHaveURL('/companies');

    // Navigate back and go to categories
    await page.goto('/');
    await page.getByRole('link', { name: /Browse by Category/i }).click();
    await expect(page).toHaveURL('/categories');
  });
});
