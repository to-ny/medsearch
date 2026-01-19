import { test, expect } from '@playwright/test';

test('root URL redirects to English', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en/);
});

test('all 4 languages render entity pages', async ({ page }) => {
  const languages = ['en', 'nl', 'fr', 'de'];

  for (const lang of languages) {
    await page.goto(`/${lang}/substances/974`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/parac[eé]tamol/i);
  }
});
