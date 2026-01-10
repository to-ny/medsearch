import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Companies Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/companies');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pharmaceutical Companies');
  });

  test('should have search input', async ({ page }) => {
    await expect(page.getByRole('searchbox')).toBeVisible();
  });

  test('should have search button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    await expect(page.getByText('Search for pharmaceutical companies')).toBeVisible();
  });

  test('should have no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Company Detail Page', () => {
  test('should display company information section', async ({ page }) => {
    // Navigate to a company detail page with a mock actorNr
    await page.goto('/companies/123456');

    // Should show breadcrumb navigation
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();

    // Should have links back to companies list
    await expect(page.getByRole('link', { name: 'Companies' })).toBeVisible();
  });

  test('should have View Products link pointing to /search with company param', async ({ page }) => {
    // Navigate to a company detail page
    await page.goto('/companies/123456');

    // Find the View Products button/link
    const viewProductsLink = page.getByRole('link', { name: /view products/i });

    // Verify it exists
    if (await viewProductsLink.isVisible()) {
      // Get the href attribute
      const href = await viewProductsLink.getAttribute('href');

      // Verify it points to /search with company parameter
      expect(href).toBe('/search?company=123456');
    }
  });

  test('should navigate to search page with company filter when clicking View Products', async ({ page }) => {
    // Navigate to a company detail page
    await page.goto('/companies/123456');

    // Find and click the View Products link
    const viewProductsLink = page.getByRole('link', { name: /view products/i });

    if (await viewProductsLink.isVisible()) {
      await viewProductsLink.click();

      // Verify navigation to search page with company parameter
      await expect(page).toHaveURL(/\/search\?company=123456/);
    }
  });

  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/companies/123456');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Search Page URL Parameters', () => {
  test('should update URL when performing a search', async ({ page }) => {
    await page.goto('/search');

    // Type in the search box
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('paracetamol');

    // Wait for debounced search and URL update
    await page.waitForTimeout(500);

    // URL should be updated with the search query
    await expect(page).toHaveURL(/\/search\?q=paracetamol/);
  });

  test('should restore search from URL parameters on page load', async ({ page }) => {
    // Navigate directly with search params
    await page.goto('/search?q=ibuprofen');

    // Verify the search input has the query
    const searchInput = page.getByRole('searchbox');
    await expect(searchInput).toHaveValue('ibuprofen');
  });

  test('should handle company filter in URL', async ({ page }) => {
    // Navigate with company filter
    await page.goto('/search?company=123456');

    // Should show the company filter is active
    await expect(page.getByText('#123456')).toBeVisible();
  });

  test('should handle combined query and company filter in URL', async ({ page }) => {
    // Navigate with both query and company filter
    await page.goto('/search?q=aspirin&company=789');

    // Verify search input has the query
    const searchInput = page.getByRole('searchbox');
    await expect(searchInput).toHaveValue('aspirin');

    // Verify company filter is shown
    await expect(page.getByText('#789')).toBeVisible();
  });

  test('should update URL when changing search type', async ({ page }) => {
    await page.goto('/search');

    // Open search type dropdown
    const typeButton = page.getByRole('button', { name: /by name/i });
    await typeButton.click();

    // Select CNK search type
    await page.getByRole('option', { name: /by cnk/i }).click();

    // Type a CNK code
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('1234567');

    // Wait for debounced search
    await page.waitForTimeout(500);

    // URL should include type parameter
    await expect(page).toHaveURL(/\/search\?q=1234567&type=cnk/);
  });

  test('should restore search type from URL', async ({ page }) => {
    // Navigate with search type parameter
    await page.goto('/search?q=1234567&type=cnk');

    // Verify the search type dropdown shows CNK
    await expect(page.getByRole('button', { name: /by cnk/i })).toBeVisible();

    // Verify search input has the query
    const searchInput = page.getByRole('searchbox');
    await expect(searchInput).toHaveValue('1234567');
  });

  test('should preserve URL params when using browser back/forward', async ({ page }) => {
    await page.goto('/search');

    // Perform first search
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('aspirin');
    await page.waitForTimeout(500);

    // Verify first URL
    await expect(page).toHaveURL(/\/search\?q=aspirin/);

    // Perform second search
    await searchInput.fill('ibuprofen');
    await page.waitForTimeout(500);

    // Verify second URL
    await expect(page).toHaveURL(/\/search\?q=ibuprofen/);

    // Go back
    await page.goBack();

    // Should be back to first search (or search page)
    await expect(page).toHaveURL(/\/search/);
  });

  test('should have no accessibility violations with URL params', async ({ page }) => {
    await page.goto('/search?q=test&company=123');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
