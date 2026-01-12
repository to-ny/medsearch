import { test, expect } from '@playwright/test';

test.describe('Compare Page', () => {
  test('should display compare page and allow searching', async ({ page }) => {
    await page.goto('/compare');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Compare Medications');
    await expect(page.getByText('Select a medication to compare')).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();
  });

  test('should search by CNK and show comparison', async ({ page }) => {
    await page.goto('/compare');

    // Select CNK search type (default is Name)
    await page.getByRole('button', { name: 'Name' }).click();
    await page.getByRole('option', { name: 'CNK Code' }).click();

    // Search by CNK code
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('1482223'); // Dafalgan Codeine CNK
    await searchInput.press('Enter');

    // Should show the selected medication
    await expect(page.getByText('Selected Medication')).toBeVisible({ timeout: 15000 });
  });

  test('should allow changing selection', async ({ page }) => {
    await page.goto('/compare');

    // Select CNK search type (default is Name)
    await page.getByRole('button', { name: 'Name' }).click();
    await page.getByRole('option', { name: 'CNK Code' }).click();

    // Search and select
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('1482223');
    await searchInput.press('Enter');
    await expect(page.getByText('Selected Medication')).toBeVisible({ timeout: 15000 });

    // Change selection
    await page.getByText('Change selection').click();
    await expect(page.getByText('Search for a medication to compare')).toBeVisible();
  });
});
