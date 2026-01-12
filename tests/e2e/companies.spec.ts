import { test, expect } from '@playwright/test';

test.describe('Companies Page', () => {
  test('should display companies page and allow search', async ({ page }) => {
    await page.goto('/companies');

    // Page loads with correct heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pharmaceutical Companies');
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByText('Search for pharmaceutical companies')).toBeVisible();
  });
});

test.describe('Search Page', () => {
  test('should display search page and sync URL with search state', async ({ page }) => {
    await page.goto('/search');

    // Page loads correctly
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Search Medications');
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Name' })).toBeVisible();

    // Search updates URL
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('paracetamol');
    await page.waitForURL(/\/search\?q=paracetamol/, { timeout: 5000 });
  });

  test('should restore search state from URL', async ({ page }) => {
    await page.goto('/search?q=ibuprofen&type=cnk');

    await expect(page.getByRole('searchbox')).toHaveValue('ibuprofen');
    await expect(page.getByRole('button', { name: /CNK Code/i })).toBeVisible();
  });

  test('should handle company filter in URL', async ({ page }) => {
    await page.goto('/search?company=12345');
    // Company filter badge should show the actor number
    await expect(page.getByText('#12345', { exact: true })).toBeVisible();
  });

  test('should collapse company filter by default when no company in URL', async ({ page }) => {
    await page.goto('/search');

    // Company filter should be collapsed - only the expand button visible
    await expect(page.getByText('Filter by company')).toBeVisible();

    // The input field should not be visible initially
    await expect(page.getByPlaceholder(/actor number/i)).not.toBeVisible();

    // Click to expand
    await page.getByText('Filter by company').click();

    // Now the input should be visible
    await expect(page.getByPlaceholder(/actor number/i)).toBeVisible();
  });

  test('should clear company filter when switching to ingredient search', async ({ page }) => {
    // Navigate to search with name type and company filter
    await page.goto('/search?q=test&company=01995');

    // Verify company filter is active
    await expect(page.getByText('#01995')).toBeVisible();

    // Switch to ingredient search type
    await page.getByRole('button', { name: /Name/i }).click();
    await page.getByRole('option', { name: /Ingredient/i }).click();

    // Type a search query to trigger URL update (search triggers on input)
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('paracetamol');

    // Wait for debounced search to update URL - company should be cleared
    await page.waitForURL(/\/search\?q=paracetamol&type=ingredient$/);
    await expect(page.getByText('#01995')).not.toBeVisible();
  });

  test('should disable company filter button when ingredient type is selected', async ({ page }) => {
    // Navigate to search with ingredient type
    await page.goto('/search?type=ingredient');

    // Company filter button should be disabled
    const filterButton = page.getByText('Filter by company');
    await expect(filterButton).toBeVisible();
    await expect(filterButton).toBeDisabled();
    await expect(page.getByText(/not available for ingredient/i)).toBeVisible();
  });
});

test.describe('Company Detail to Search Flow', () => {
  test('should navigate from company page to search with filter applied', async ({ page }) => {
    // First, search for a company to get a valid actor number
    await page.goto('/companies');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('pharma');

    // Wait for results
    await page.waitForSelector('[href^="/companies/"]', { timeout: 10000 });

    // Click on first company result
    const firstCompanyLink = page.locator('[href^="/companies/"]').first();
    const companyHref = await firstCompanyLink.getAttribute('href');
    const actorNr = companyHref?.split('/companies/')[1];
    await firstCompanyLink.click();

    // Wait for company detail page
    await page.waitForURL(/\/companies\/\d+/);

    // Get company name for later verification
    const companyName = await page.getByRole('heading', { level: 1 }).textContent();

    // Click "Search their products" link
    await page.getByRole('link', { name: 'Search their products' }).click();

    // Verify navigation to search page with company filter
    await page.waitForURL(new RegExp(`/search\\?company=${actorNr}`));

    // Verify company filter is shown as active (badge with company name or actor number)
    if (companyName) {
      const companyIndicator = page.getByText(companyName).or(page.getByText(`#${actorNr}`));
      await expect(companyIndicator.first()).toBeVisible();
    }

    // Verify "View company" link is present to go back
    await expect(page.getByRole('link', { name: 'View company' })).toBeVisible();
  });
});
