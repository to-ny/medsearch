import { test, expect } from '@playwright/test';

// =============================================================================
// AMPP (Package) Detail Page
// =============================================================================

test('AMPP shows pricing, AMP link, and reimbursement info', async ({ page }) => {
  // Haldol 5 mg/ml - has pricing, reimbursement data
  await page.goto('/en/packages/000025-02');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/Haldol/i);
  await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
  await expect(page.locator('main')).toContainText(/€|EUR/);
});

// =============================================================================
// AMP (Brand Medication) Detail Page
// =============================================================================

test('AMP shows black triangle warning when applicable', async ({ page }) => {
  // Celldemic - has black triangle (enhanced monitoring)
  await page.goto('/en/medications/SAM662556-00');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/Celldemic/i);
  await expect(page.getByRole('heading', { name: /Enhanced Monitoring/i })).toBeVisible();
});

test('AMP shows active ingredients list', async ({ page }) => {
  // Kidiamix G15 % - has 35 ingredients
  await page.goto('/en/medications/SAM461564-00');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/Kidiamix/i);
  // Verify actual ingredient section heading exists
  await expect(page.getByRole('heading', { name: /ingredient/i })).toBeVisible();
  // Verify ingredients are listed (substance names visible)
  await expect(page.locator('main')).toContainText(/glucose|sodium|potassium|calcium/i);
});

// =============================================================================
// VMP (Generic Product) Detail Page
// =============================================================================

test('VMP links to substance and shows brand products', async ({ page }) => {
  // pantoprazol 20 mg - linked to VTM, has brand products
  await page.goto('/en/generics/26377');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/pantoprazol/i);
  // Must link to active substance
  await expect(page.locator('a[href*="/substances/"]').first()).toBeVisible();
  // Must show brand products with links to AMP pages
  await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
});

// =============================================================================
// VTM (Active Substance) Detail Page
// =============================================================================

test('VTM shows generic products list', async ({ page }) => {
  // paracetamol - has many generic products
  await page.goto('/en/substances/974');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/parac[eé]tamol/i);
  // Must have links to VMP (generic) pages
  await expect(page.locator('a[href*="/generics/"]').first()).toBeVisible();
});

// =============================================================================
// Company Detail Page
// =============================================================================

test('Company shows location and product links', async ({ page }) => {
  // Boiron - French company with many products
  await page.goto('/en/companies/02605');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/Boiron/i);
  await expect(page.locator('main')).toContainText(/France|Messimy/i);
  await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
});

// =============================================================================
// VMP Group (Therapeutic Group) Detail Page
// =============================================================================

test('VMP Group shows member product links', async ({ page }) => {
  // lenograstim group
  await page.goto('/en/therapeutic-groups/18689');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/lenograstim/i);
  // Must have links to VMP (generic) pages
  await expect(page.locator('a[href*="/generics/"]').first()).toBeVisible();
});

// =============================================================================
// ATC Classification Detail Page
// =============================================================================

test('ATC shows hierarchy breadcrumb and package links', async ({ page }) => {
  // Atorvastatin - C10AA05
  await page.goto('/en/classifications/C10AA05');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1')).toContainText(/Atorvastatin/i);
  // Should show parent classification (C10 = lipid modifying)
  await expect(page.locator('a[href*="/classifications/C10"]').first()).toBeVisible();
  // Should link to packages
  await expect(page.locator('a[href*="/packages/"]').first()).toBeVisible();
});

// =============================================================================
// Chapter IV Detail Page
// =============================================================================

test('Chapter IV shows paragraph info and indication', async ({ page }) => {
  // hepatocellulair carcinoom
  await page.goto('/en/chapter-iv/IV/4770000');
  await page.waitForLoadState('networkidle');

  // Should show paragraph number
  await expect(page.locator('main')).toContainText(/4770000/);
  // Should show the medical indication
  await expect(page.locator('main')).toContainText(/hepatocellul|carcinoma|HCC/i);
});

// =============================================================================
// Sidebar Features Tests
// =============================================================================

test('AMP sidebar shows validity indicator', async ({ page }) => {
  // Any AMP page should show Active/Expired status in sidebar
  await page.goto('/en/medications/SAM662556-00');
  await page.waitForLoadState('networkidle');

  // Target the sidebar summary box specifically
  const sidebar = page.locator('.bg-gray-50, .dark\\:bg-gray-800\\/50').filter({ hasText: 'Summary' }).first();
  await expect(sidebar).toBeVisible();

  // Find the row with Validity label and verify it shows Active or Expired
  const validityRow = sidebar.locator('div.flex.justify-between').filter({ hasText: 'Validity' });
  await expect(validityRow).toBeVisible();
  await expect(validityRow.locator('span.font-medium')).toContainText(/Active|Expired/);
});

test('AMP sidebar shows reimbursable percentage', async ({ page }) => {
  // Chlorure de Sodium Aguettant - has many reimbursable packages
  await page.goto('/en/medications/SAM208966-00');
  await page.waitForLoadState('networkidle');

  // Sidebar should show reimbursable percentage - look for text pattern in sidebar area
  const sidebarArea = page.locator('.lg\\:col-span-1, .space-y-6').last();
  await expect(sidebarArea).toBeVisible();

  // Verify that the sidebar contains a percentage value for reimbursable
  await expect(sidebarArea).toContainText(/\d+%/);
});

test('VTM sidebar shows package count', async ({ page }) => {
  // paracetamol - has many packages
  await page.goto('/en/substances/974');
  await page.waitForLoadState('networkidle');

  // The sidebar contains a Summary section with package stats
  // Look for any element containing "Package" text (either "Packages" or "Package Count")
  await expect(page.getByText(/Package/i).first()).toBeVisible();

  // Verify the page displays numeric statistics (package count, brand products, etc.)
  const mainContent = await page.locator('main').textContent() || '';
  // Should contain numbers representing counts
  expect(mainContent).toMatch(/\d+/);
});

test('ATC sidebar shows level indicator', async ({ page }) => {
  // Atorvastatin - C10AA05 (level 5)
  await page.goto('/en/classifications/C10AA05');
  await page.waitForLoadState('networkidle');

  // Target the sidebar summary box specifically
  const sidebar = page.locator('.bg-gray-50, .dark\\:bg-gray-800\\/50').filter({ hasText: 'Summary' }).first();
  await expect(sidebar).toBeVisible();

  // Find the row with Level label and verify it shows a number 1-5
  const levelRow = sidebar.locator('div.flex.justify-between').filter({ hasText: /Level/i });
  await expect(levelRow).toBeVisible();
  const levelText = await levelRow.locator('span.font-medium').textContent();
  const level = parseInt(levelText || '0');
  expect(level).toBeGreaterThanOrEqual(1);
  expect(level).toBeLessThanOrEqual(5);
});

test('Company sidebar shows product statistics', async ({ page }) => {
  // Boiron - has multiple products
  await page.goto('/en/companies/02605');
  await page.waitForLoadState('networkidle');

  // Verify the page has a Summary section (sidebar)
  await expect(page.getByText('Summary')).toBeVisible();

  // Verify Products text is visible (company has products)
  await expect(page.getByText('Products').first()).toBeVisible();

  // Verify page displays numeric statistics
  const mainContent = await page.locator('main').textContent() || '';
  // Should contain multiple numbers (product count, package count, etc.)
  const numberMatches = mainContent.match(/\d+/g);
  expect(numberMatches).not.toBeNull();
  expect(numberMatches!.length).toBeGreaterThan(1);
});

test('VMP Group sidebar shows validity indicator', async ({ page }) => {
  // lenograstim group
  await page.goto('/en/therapeutic-groups/18689');
  await page.waitForLoadState('networkidle');

  // Sidebar should show validity status
  await expect(page.locator('main')).toContainText(/Active|Expired/);
});

// =============================================================================
// Search All Links Tests
// =============================================================================

test.describe('Search All Links', () => {
  test('VTM page "Search all" link returns packages', async ({ page }) => {
    // Navigate to paracetamol VTM page
    await page.goto('/en/substances/974');
    await page.waitForLoadState('networkidle');

    // Find "Search all" link in Available Packages section header
    const searchAllLink = page.locator('section:has-text("Available Packages") a:has-text("Search all"), section:has-text("Package") a:has-text("Search all")').first();
    await expect(searchAllLink).toBeVisible();

    // Click the link
    await searchAllLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains search with vtm filter and ampp type
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/vtm=974/);
    await expect(page).toHaveURL(/types=ampp/);

    // Verify results are displayed
    const amppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('VMP page "Search all" link for brand products returns results', async ({ page }) => {
    // Navigate to pantoprazol VMP page
    await page.goto('/en/generics/26377');
    await page.waitForLoadState('networkidle');

    // Find "Search all" link near the Brand Products heading
    // The RelationshipList uses h3 for title, and the link is a sibling in the header div
    const brandSection = page.locator('h3:has-text("Brand Products")').locator('..');
    const searchAllLink = brandSection.locator('a:has-text("Search all")');
    await expect(searchAllLink).toBeVisible();

    // Click the link
    await searchAllLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains search with vmp filter and amp type
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/vmp=26377/);
    await expect(page).toHaveURL(/types=amp/);

    // Verify results are displayed
    const ampBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    await expect(ampBadge).toBeVisible();
    const badgeText = await ampBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('VMP page "Search all" link for packages returns results', async ({ page }) => {
    // Navigate to pantoprazol VMP page
    await page.goto('/en/generics/26377');
    await page.waitForLoadState('networkidle');

    // Find "Search all" link in Available Packages section header
    const searchAllLink = page.locator('section:has-text("Available Packages") a:has-text("Search all"), section:has-text("Package") a:has-text("Search all")').first();
    await expect(searchAllLink).toBeVisible();

    // Click the link
    await searchAllLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains search with vmp filter and ampp type
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/vmp=26377/);
    await expect(page).toHaveURL(/types=ampp/);

    // Verify results are displayed
    const amppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Company page "Search all" link returns products', async ({ page }) => {
    // Navigate to Boiron company page
    await page.goto('/en/companies/02605');
    await page.waitForLoadState('networkidle');

    // Find "Search all" link in Products section header
    const searchAllLink = page.locator('section:has-text("Products") a:has-text("Search all"), section:has-text("Product") a:has-text("Search all")').first();
    await expect(searchAllLink).toBeVisible();

    // Click the link
    await searchAllLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains search with company filter
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/company=02605/);

    // Verify results are displayed (could be any type)
    const resultLink = page.locator('a[href*="/medications/"], a[href*="/packages/"]').first();
    await expect(resultLink).toBeVisible();
  });

  test('ATC page "Search all" link returns packages', async ({ page }) => {
    // Navigate to Atorvastatin ATC page
    await page.goto('/en/classifications/C10AA05');
    await page.waitForLoadState('networkidle');

    // Find "Search all" link in Products section header
    const searchAllLink = page.locator('section:has-text("Products") a:has-text("Search all"), section:has-text("Package") a:has-text("Search all")').first();
    await expect(searchAllLink).toBeVisible();

    // Click the link
    await searchAllLink.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains search with atc filter and ampp type
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/atc=C10AA05/);
    await expect(page).toHaveURL(/types=ampp/);

    // Verify results are displayed
    const amppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);
  });

  test('Substance (ingredient) page "Search all" link returns products', async ({ page }) => {
    // Navigate to sodium ascorbate ingredient page - has 8 AMP products
    await page.goto('/en/ingredients/sodium-ascorbate_19');
    await page.waitForLoadState('networkidle');

    // The page should show products section with count
    await expect(page.getByText(/Products Containing/i)).toBeVisible();

    // Find "Search all" link if it exists (only shown when count > 0)
    const searchAllLink = page.locator('a:has-text("Search all")');
    if (await searchAllLink.count() > 0) {
      // Click the link
      await searchAllLink.first().click();
      await page.waitForLoadState('networkidle');

      // Verify URL contains search with substance filter and amp type
      await expect(page).toHaveURL(/\/search/);
      await expect(page).toHaveURL(/substance=19/);
      await expect(page).toHaveURL(/types=amp/);

      // Verify results are displayed
      await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
    } else {
      // If no Search all link, verify that the count is 0
      await expect(page.getByText(/\(0\)/)).toBeVisible();
    }
  });
});
