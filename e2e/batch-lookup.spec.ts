import { test, expect } from '@playwright/test';

test.describe('Batch Lookup Page', () => {
  test('loads correctly in all languages', async ({ page }) => {
    const languages = ['en', 'nl', 'fr', 'de'];

    for (const lang of languages) {
      await page.goto(`/${lang}/batch-lookup`);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('textarea')).toBeVisible();
    }
  });

  test('shows form with textarea and submit button', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: /look up/i })).toBeVisible();
  });

  test('validates empty input', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const submitButton = page.getByRole('button', { name: /look up/i });
    await expect(submitButton).toBeDisabled();
  });

  test('validates invalid CNK codes', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const textarea = page.locator('textarea');
    await textarea.fill('123, abc, 12345678');

    await expect(page.locator('#cnk-errors')).toContainText(/invalid/i);
  });

  test('accepts valid CNK codes', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const textarea = page.locator('textarea');
    await textarea.fill('1234567, 2345678');

    const submitButton = page.getByRole('button', { name: /look up/i });
    await expect(submitButton).toBeEnabled();
    await expect(page.locator('label')).toContainText('2 valid code');
  });

  test('handles mixed separators', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const textarea = page.locator('textarea');
    await textarea.fill('1234567,2345678 3456789\n4567890');

    await expect(page.locator('label')).toContainText('4 valid code');
  });

  test('removes duplicate codes with warning', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const textarea = page.locator('textarea');
    await textarea.fill('1234567, 1234567, 2345678');

    await expect(page.locator('body')).toContainText(/duplicate/i);
    await expect(page.locator('label')).toContainText('2 valid code');
  });

  test('enforces maximum 100 codes limit', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const codes = Array.from({ length: 101 }, (_, i) =>
      String(1000000 + i)
    ).join(', ');

    const textarea = page.locator('textarea');
    await textarea.fill(codes);

    await expect(page.locator('#cnk-errors')).toContainText(/100/);
  });

  test('clear button resets form', async ({ page }) => {
    await page.goto('/en/batch-lookup');

    const textarea = page.locator('textarea');
    await textarea.fill('1234567');

    const clearButton = page.getByRole('button', { name: /clear all/i });
    await clearButton.click();

    await expect(textarea).toHaveValue('');
  });
});
