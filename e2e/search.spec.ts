import { test, expect } from '@playwright/test';

// ==========================================
// Relationship Filter Search Tests
// ==========================================

test.describe('Relationship Filter Search', () => {
  test('substance filter returns AMP results', async ({ page }) => {
    await page.goto('/en/search?types=amp&substance=12581');
    await page.waitForLoadState('networkidle');

    // Extract count from the Brand/AMP badge
    const ampBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    await expect(ampBadge).toBeVisible();
    const badgeText = await ampBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Verify at least one result links to /medications/
    await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
  });

  test('company filter returns AMPP results', async ({ page }) => {
    await page.goto('/en/search?types=ampp&company=00413');
    await page.waitForLoadState('networkidle');

    // Extract count from the Package badge
    const amppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Verify at least one result links to /packages/
    await expect(page.locator('a[href*="/packages/"]').first()).toBeVisible();
  });

  test('ATC filter returns AMPP results', async ({ page }) => {
    // Use ATC code for atorvastatin which has many packages
    await page.goto('/en/search?types=ampp&atc=C10AA05');
    await page.waitForLoadState('networkidle');

    // Verify results are shown by checking for package links
    await expect(page.locator('a[href*="/packages/"]').first()).toBeVisible();

    // Verify the URL has the correct filters
    await expect(page).toHaveURL(/atc=C10AA05/);
    await expect(page).toHaveURL(/types=ampp/);
  });

  test('VTM filter returns VMP results', async ({ page }) => {
    await page.goto('/en/search?types=vmp&vtm=974');
    await page.waitForLoadState('networkidle');

    // Extract count from the Generic badge
    const vmpBadge = page.locator('button[aria-pressed]:has-text("Generic")');
    await expect(vmpBadge).toBeVisible();
    const badgeText = await vmpBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Verify at least one result links to /generics/
    await expect(page.locator('a[href*="/generics/"]').first()).toBeVisible();
  });

  test('VMP filter returns AMP results', async ({ page }) => {
    await page.goto('/en/search?types=amp&vmp=26377');
    await page.waitForLoadState('networkidle');

    // Extract count from the Brand badge
    const ampBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    await expect(ampBadge).toBeVisible();
    const badgeText = await ampBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Verify at least one result links to /medications/
    await expect(page.locator('a[href*="/medications/"]').first()).toBeVisible();
  });

  test('VMP Group filter returns VMP results', async ({ page }) => {
    await page.goto('/en/search?types=vmp&vmpGroup=18689');
    await page.waitForLoadState('networkidle');

    // Extract count from the Generic badge
    const vmpBadge = page.locator('button[aria-pressed]:has-text("Generic")');
    await expect(vmpBadge).toBeVisible();
    const badgeText = await vmpBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Verify at least one result links to /generics/
    await expect(page.locator('a[href*="/generics/"]').first()).toBeVisible();
  });
});

// ==========================================
// Search Input Focus Behavior Tests
// ==========================================

test.describe('Search Input Focus Behavior', () => {
  test('input is NOT focused when arriving with relationship filters', async ({ page }) => {
    await page.goto('/en/search?types=amp&substance=12581');
    await page.waitForLoadState('networkidle');

    // Check that the search input is NOT focused
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElementTag).not.toBe('INPUT');

    // Verify recent searches dropdown is NOT visible
    const recentSearchesDropdown = page.locator('[role="listbox"], [data-testid="recent-searches"]');
    await expect(recentSearchesDropdown).not.toBeVisible();
  });

  test('input is NOT focused when arriving with toggle filters', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Check that the search input is NOT focused
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElementTag).not.toBe('INPUT');
  });

  test('input is NOT focused when arriving with query parameter', async ({ page }) => {
    await page.goto('/en/search?q=test');
    await page.waitForLoadState('networkidle');

    // With a query present, input should NOT be focused (existing behavior)
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElementTag).not.toBe('INPUT');
  });

  test('input IS focused when arriving at empty search page', async ({ page }) => {
    await page.goto('/en/search');
    await page.waitForLoadState('networkidle');

    // With no query and no filters, input SHOULD be focused
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElementTag).toBe('INPUT');
  });
});

// ==========================================
// CNK Quick Search tests
// ==========================================
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

  // Company filter should show results - target the entity type filter button specifically (has aria-pressed)
  const companyFilter = page.locator('button[aria-pressed]:has-text("Company")');
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
  // Use a common prefix that returns many results across entity types
  await page.goto('/en/search?q=acid&types=vtm,vmp,ampp');
  await page.waitForLoadState('networkidle');

  // Should show results
  await expect(page.locator('main')).toContainText(/acid/i);

  // Page 2 button must exist for this test to be meaningful
  const page2Button = page.locator('button[aria-label="Page 2"]');
  await expect(page2Button).toBeVisible();

  // Navigate to page 2
  await page2Button.click();
  await page.waitForLoadState('networkidle');

  // Should still show results on page 2
  await expect(page.locator('a[href*="/substances/"], a[href*="/generics/"], a[href*="/packages/"]').first()).toBeVisible();
});

// ==========================================
// Entity Badge Expand/Collapse Tests
// ==========================================

test.describe('Entity Badge Expand/Collapse', () => {
  test('shows top badges + "+N" collapsed, expands on click', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Count initial visible badges (All + top 3 + possibly selected not in top 3)
    const allBadges = page.locator('button[aria-pressed]');
    const initialBadgeCount = await allBadges.count();

    // Verify expand button shows +N if there are more types (use a more specific selector)
    const expandBtn = page.locator('button[aria-expanded="false"]:text-matches("^\\\\+\\\\d+$")');
    if (await expandBtn.count() > 0) {
      const expandText = await expandBtn.textContent();
      expect(expandText).toMatch(/^\+\d+$/);

      // Click to expand
      await expandBtn.click();

      // Verify all types visible and collapse button appears
      await expect(page.locator('button[aria-expanded="true"]:has-text("Less")')).toBeVisible();

      // Should have more badges now
      const expandedBadgeCount = await allBadges.count();
      expect(expandedBadgeCount).toBeGreaterThanOrEqual(initialBadgeCount);
    }
  });

  test('selected type remains visible when collapsed', async ({ page }) => {
    // Select ATC which is typically not in top 3 by count
    await page.goto('/en/search?q=paracetamol&types=atc');
    await page.waitForLoadState('networkidle');

    // ATC should be visible even if it has low count
    await expect(page.locator('button[aria-pressed="true"]:has-text("ATC")')).toBeVisible();
  });
});

// ==========================================
// Filter Modal Tests
// ==========================================

test.describe('Filter Modal', () => {
  test('Filters button appears and shows active filter count', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Filters button should be visible
    const filtersButton = page.locator('button:has-text("Filters")');
    await expect(filtersButton).toBeVisible();

    // With no filters, no count badge
    const countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).not.toBeVisible();
  });

  test('filters modal opens and applies changes', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Get baseline
    const baselineBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineCount = parseInt((await baselineBadge.textContent())?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineCount).toBeGreaterThan(0);

    // Open modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Toggle reimbursable filter
    await page.locator('label:has-text("Reimbursable")').click();

    // Apply
    await page.locator('[role="dialog"] button:has-text("Apply")').click();
    await page.waitForLoadState('networkidle');

    // Verify filter applied
    await expect(page).toHaveURL(/reimbursable=true/);

    // Filter badge should show 1
    const filtersButton = page.locator('button:has-text("Filters")');
    const countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('1');
  });

  test('modal close discards changes', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Toggle filter
    await page.locator('label:has-text("Reimbursable")').click();

    // Close without apply (click close button)
    await page.locator('[role="dialog"] button[aria-label="Close"]').click();

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify filter NOT applied
    await expect(page).not.toHaveURL(/reimbursable/);
  });

  test('modal shows relevant filter sections', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Should show Availability section (has AMPP results)
    await expect(page.locator('[role="dialog"]').getByText('Availability')).toBeVisible();

    // Should show reimbursable option
    await expect(page.locator('[role="dialog"]').getByText('Reimbursable')).toBeVisible();

    // Should show Chapter IV option
    await expect(page.locator('[role="dialog"]').getByText('Chapter IV')).toBeVisible();

    // Should show delivery environment options
    await expect(page.locator('[role="dialog"]').getByText('Delivery Environment')).toBeVisible();
  });

  test('modal reset clears filters but requires apply', async ({ page }) => {
    // Start with a filter applied
    await page.goto('/en/search?q=paracetamol&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Find the Reimbursable checkbox specifically (the label contains the checkbox)
    const reimbursableLabel = page.locator('[role="dialog"] label:has-text("Reimbursable")');
    const reimbursableCheckbox = reimbursableLabel.locator('input[type="checkbox"]');
    await expect(reimbursableCheckbox).toBeChecked();

    // Click reset
    await page.locator('[role="dialog"] button:has-text("Reset")').click();

    // Checkbox should be unchecked
    await expect(reimbursableCheckbox).not.toBeChecked();

    // But URL should still have the filter (not applied yet)
    await expect(page).toHaveURL(/reimbursable=true/);

    // Now apply
    await page.locator('[role="dialog"] button:has-text("Apply")').click();
    await page.waitForLoadState('networkidle');

    // Now filter should be removed
    await expect(page).not.toHaveURL(/reimbursable/);
  });
});

// ==========================================
// Filter Functionality Tests (via Modal)
// ==========================================

test.describe('Filter Functionality', () => {
  test('deliveryEnv=P filter restricts AMPP results to public pharmacy only', async ({ page }) => {
    // Test with insulin which has both public and hospital-only packages
    await page.goto('/en/search?q=insulin');
    await page.waitForLoadState('networkidle');

    const baselineAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineCount = await baselineAmppBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With public delivery filter
    await page.goto('/en/search?q=insulin&deliveryEnv=P');
    await page.waitForLoadState('networkidle');

    const publicAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const publicCount = await publicAmppBadge.textContent();
    const publicNumber = parseInt(publicCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Public filter must reduce count (insulin has hospital-only packages)
    expect(publicNumber).toBeLessThan(baselineNumber);
  });

  test('deliveryEnv=H filter restricts AMPP results to hospital only', async ({ page }) => {
    // Test with insulin which has both public and hospital-only packages
    await page.goto('/en/search?q=insulin');
    await page.waitForLoadState('networkidle');

    const baselineAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineCount = await baselineAmppBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With hospital delivery filter
    await page.goto('/en/search?q=insulin&deliveryEnv=H');
    await page.waitForLoadState('networkidle');

    const hospitalAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const hospitalCount = await hospitalAmppBadge.textContent();
    const hospitalNumber = parseInt(hospitalCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Hospital filter must reduce count (insulin has public-only packages)
    expect(hospitalNumber).toBeLessThan(baselineNumber);
  });

  test('chapterIV=true filters to only Chapter IV medications', async ({ page }) => {
    // Use atorvastatin - a common statin that is NOT Chapter IV
    await page.goto('/en/search?q=atorvastatin');
    await page.waitForLoadState('networkidle');

    const baselineAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineCount = await baselineAmppBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With chapter IV filter - atorvastatin has no Chapter IV packages
    await page.goto('/en/search?q=atorvastatin&chapterIV=true');
    await page.waitForLoadState('networkidle');

    const filteredAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const filteredCount = await filteredAmppBadge.textContent();
    const filteredNumber = parseInt(filteredCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Chapter IV filter should reduce count (atorvastatin is not Chapter IV restricted)
    expect(filteredNumber).toBeLessThan(baselineNumber);
  });

  test('reimbursable=true filters to only reimbursable packages', async ({ page }) => {
    // Use vitamin - many vitamin products are not reimbursable
    await page.goto('/en/search?q=vitamin');
    await page.waitForLoadState('networkidle');

    const baselineAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineCount = await baselineAmppBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With reimbursable filter
    await page.goto('/en/search?q=vitamin&reimbursable=true');
    await page.waitForLoadState('networkidle');

    const filteredAmppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const filteredCount = await filteredAmppBadge.textContent();
    const filteredNumber = parseInt(filteredCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Reimbursable filter should reduce count (many vitamins aren't reimbursed)
    expect(filteredNumber).toBeLessThan(baselineNumber);
  });

  test('blackTriangle=true filters to only enhanced monitoring medications', async ({ page }) => {
    // Search for paracetamol - a common medication where most brands are NOT under enhanced monitoring
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    const baselineAmpBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    const baselineCount = await baselineAmpBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With black triangle filter - paracetamol brands are not under enhanced monitoring
    await page.goto('/en/search?q=paracetamol&blackTriangle=true');
    await page.waitForLoadState('networkidle');

    const filteredAmpBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    const filteredCount = await filteredAmpBadge.textContent();
    const filteredNumber = parseInt(filteredCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Black triangle filter must reduce count (paracetamol brands are not under enhanced monitoring)
    expect(filteredNumber).toBeLessThan(baselineNumber);
  });

  test('medicineType=ALLOPATHIC filter restricts to allopathic medicines only', async ({ page }) => {
    // Search for arnica which has both allopathic and homeopathic products
    await page.goto('/en/search?q=arnica');
    await page.waitForLoadState('networkidle');

    const baselineAmpBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    const baselineCount = await baselineAmpBadge.textContent();
    const baselineNumber = parseInt(baselineCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineNumber).toBeGreaterThan(0); // Ensure we have baseline data

    // With allopathic filter - arnica is primarily homeopathic so this should filter most out
    await page.goto('/en/search?q=arnica&medicineType=ALLOPATHIC');
    await page.waitForLoadState('networkidle');

    const filteredAmpBadge = page.locator('button[aria-pressed]:has-text("Brand")');
    const filteredCount = await filteredAmpBadge.textContent();
    const filteredNumber = parseInt(filteredCount?.match(/\((\d+)\)/)?.[1] || '0');

    // Allopathic filter must reduce count (arnica is primarily homeopathic)
    expect(filteredNumber).toBeLessThan(baselineNumber);
  });

  test('filters can be cleared via URL navigation', async ({ page }) => {
    // Start with a filter
    await page.goto('/en/search?q=paracetamol&deliveryEnv=P');
    await page.waitForLoadState('networkidle');

    // Verify filter is active - the badge with count should be visible in the Filters button
    const filtersButton = page.locator('button:has-text("Filters")');
    const countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('1');

    // Navigate without filter
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Verify filter is no longer active - count badge should not be visible
    const cleanButton = page.locator('button:has-text("Filters")');
    const cleanCountBadge = cleanButton.locator('span.rounded-full');
    await expect(cleanCountBadge).not.toBeVisible();
  });
});

// ==========================================
// Filter Combination Tests
// ==========================================

test.describe('Filter Combinations', () => {
  test('multiple filters combine to further restrict results', async ({ page }) => {
    // First get baseline count
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    const baselineBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const baselineText = await baselineBadge.textContent();
    const baselineCount = parseInt(baselineText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineCount).toBeGreaterThan(0);

    // Apply single filter
    await page.goto('/en/search?q=paracetamol&deliveryEnv=P');
    await page.waitForLoadState('networkidle');

    const singleFilterBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const singleFilterText = await singleFilterBadge.textContent();
    const singleFilterCount = parseInt(singleFilterText?.match(/\((\d+)\)/)?.[1] || '0');

    // Apply multiple filters
    await page.goto('/en/search?q=paracetamol&deliveryEnv=P&reimbursable=true');
    await page.waitForLoadState('networkidle');

    const multiFilterBadge = page.locator('button[aria-pressed]:has-text("Package")');
    const multiFilterText = await multiFilterBadge.textContent();
    const multiFilterCount = parseInt(multiFilterText?.match(/\((\d+)\)/)?.[1] || '0');

    // Multiple filters should be at most as restrictive as single filter
    expect(multiFilterCount).toBeLessThanOrEqual(singleFilterCount);
    expect(singleFilterCount).toBeLessThanOrEqual(baselineCount);

    // Filters button should show count of 2
    const filtersButton = page.locator('button:has-text("Filters")');
    const countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toHaveText('2');
  });

  test('modal allows changing filters without affecting URL until apply', async ({ page }) => {
    // Start with one filter
    await page.goto('/en/search?q=paracetamol&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Open modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Add another filter (chapter IV)
    await page.locator('[role="dialog"] label:has-text("Chapter IV")').click();

    // URL should still only have reimbursable
    await expect(page).toHaveURL(/reimbursable=true/);
    await expect(page).not.toHaveURL(/chapterIV/);

    // Apply changes
    await page.locator('[role="dialog"] button:has-text("Apply")').click();
    await page.waitForLoadState('networkidle');

    // Now URL should have both
    await expect(page).toHaveURL(/reimbursable=true/);
    await expect(page).toHaveURL(/chapterIV=true/);
  });

  test('entity type filter combines with toggle filters', async ({ page }) => {
    // Filter by entity type AND toggle filter
    await page.goto('/en/search?q=paracetamol&types=ampp&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Should show only AMPP results that are reimbursable
    const amppBadge = page.locator('button[aria-pressed="true"]:has-text("Package")');
    await expect(amppBadge).toBeVisible();

    // Other entity types should not be selected
    const vtmBadge = page.locator('button[aria-pressed="true"]:has-text("Substance")');
    await expect(vtmBadge).not.toBeVisible();
  });
});

// ==========================================
// UX Behavior Tests
// ==========================================

test.describe('UX Behavior', () => {
  test('entity badge shows (0) count when filter excludes all results for that type', async ({ page }) => {
    // First verify atorvastatin has AMPP results without filter
    await page.goto('/en/search?q=atorvastatin');
    await page.waitForLoadState('networkidle');

    const baselinePackageBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(baselinePackageBadge).toBeVisible();
    const baselineText = await baselinePackageBadge.textContent();
    const baselineCount = parseInt(baselineText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(baselineCount).toBeGreaterThan(0); // Confirm we have AMPP results

    // Now apply chapterIV filter - atorvastatin has no Chapter IV packages
    await page.goto('/en/search?q=atorvastatin&chapterIV=true');
    await page.waitForLoadState('networkidle');

    // The Package badge should show (0) since atorvastatin is not Chapter IV
    const filteredPackageBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(filteredPackageBadge).toBeVisible();
    const filteredText = await filteredPackageBadge.textContent();
    expect(filteredText).toContain('(0)');
  });

  test('clear all filters button removes applied relationship filters', async ({ page }) => {
    // Apply multiple relationship filters - Clear all only shows when > 1 filter is active
    await page.goto('/en/search?q=paracetamol&vtm=19&atc=N02BE01');
    await page.waitForLoadState('networkidle');

    // The "Clear all" button should be visible when multiple relationship filters are applied
    // Use a more specific selector to avoid matching the mobile drawer button
    const clearAllButton = page.locator('div.flex.flex-wrap.gap-2 button:has-text("Clear all")');
    await expect(clearAllButton).toBeVisible();

    // Click clear all
    await clearAllButton.click();
    await page.waitForLoadState('networkidle');

    // URL should not have any relationship filters anymore
    await expect(page).not.toHaveURL(/vtm=/);
    await expect(page).not.toHaveURL(/atc=/);
  });

  test('modal closes on escape key', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Open the modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('modal closes on backdrop click', async ({ page }) => {
    // Set a larger viewport so the modal doesn't take full screen
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    // Open the modal
    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click backdrop at a position outside the dialog (top left corner)
    // The dialog is centered on desktop, so clicking the edges should hit the backdrop
    await page.mouse.click(10, 10);

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('active filter count badge reflects number of active toggle filters', async ({ page }) => {
    // No active filters - count badge should not be visible
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    let filtersButton = page.locator('button:has-text("Filters")');
    let countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).not.toBeVisible();

    // One active filter - badge should show "1"
    await page.goto('/en/search?q=paracetamol&reimbursable=true');
    await page.waitForLoadState('networkidle');

    filtersButton = page.locator('button:has-text("Filters")');
    countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('1');

    // Two active filters - badge should show "2"
    await page.goto('/en/search?q=paracetamol&reimbursable=true&deliveryEnv=P');
    await page.waitForLoadState('networkidle');

    filtersButton = page.locator('button:has-text("Filters")');
    countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('2');

    // Three active filters - badge should show "3"
    await page.goto('/en/search?q=paracetamol&reimbursable=true&deliveryEnv=P&chapterIV=true');
    await page.waitForLoadState('networkidle');

    filtersButton = page.locator('button:has-text("Filters")');
    countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('3');
  });
});

// ==========================================
// Section Visibility Tests
// ==========================================

test.describe('Modal Section Visibility', () => {
  test('availability section visible when AMPP results exist', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Availability section should be visible
    await expect(page.locator('[role="dialog"]').getByText('Availability')).toBeVisible();
  });

  test('brand properties section visible when AMP results exist', async ({ page }) => {
    await page.goto('/en/search?q=paracetamol');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Filters")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Brand Properties section should be visible
    await expect(page.locator('[role="dialog"]').getByText('Brand Properties')).toBeVisible();
  });
});

// ==========================================
// Edge Case Tests
// ==========================================

test.describe('Edge Cases', () => {
  test('pagination works with relationship filters', async ({ page }) => {
    // Use a common search with filters that returns many results
    await page.goto('/en/search?q=acid&types=ampp');
    await page.waitForLoadState('networkidle');

    // Verify results are displayed - use generic selector for the badge
    const amppBadge = page.locator('button[aria-pressed="true"]:has-text("Package"), button[aria-pressed]:has-text("Package")').first();
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(20); // Should have many results

    // Page 2 button should exist
    const page2Button = page.locator('button[aria-label="Page 2"]');
    await expect(page2Button).toBeVisible();

    // Navigate to page 2
    await page2Button.click();
    await page.waitForLoadState('networkidle');

    // Verify URL contains page=2
    await expect(page).toHaveURL(/page=2/);

    // Results should still display on page 2
    await expect(page.locator('a[href*="/packages/"]').first()).toBeVisible();
  });

  test('filter-only search without query text shows results', async ({ page }) => {
    // Search with only toggle filter, no query text
    await page.goto('/en/search?types=ampp&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Results should be displayed
    const amppBadge = page.locator('button[aria-pressed]:has-text("Package")');
    await expect(amppBadge).toBeVisible();
    const badgeText = await amppBadge.textContent();
    const count = parseInt(badgeText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(count).toBeGreaterThan(0);

    // Should NOT show "type at least 3 characters" message
    await expect(page.locator('main')).not.toContainText(/type at least|enter at least/i);

    // Should have actual result links
    await expect(page.locator('a[href*="/packages/"]').first()).toBeVisible();
  });

  test('combined filters restrict results appropriately', async ({ page }) => {
    // Apply filters that should reduce results but still return some
    // Use paracetamol with reimbursable filter - many reimbursable paracetamol packages exist
    await page.goto('/en/search?q=paracetamol&types=ampp&reimbursable=true');
    await page.waitForLoadState('networkidle');

    // Verify filters are applied in URL
    await expect(page).toHaveURL(/reimbursable=true/);
    await expect(page).toHaveURL(/types=ampp/);

    // The Filters button should show active filter count (1 for reimbursable)
    const filtersButton = page.locator('button:has-text("Filters")');
    await expect(filtersButton).toBeVisible();
    // Count badge should show at least 1 for the reimbursable filter
    const countBadge = filtersButton.locator('span.rounded-full');
    await expect(countBadge).toBeVisible();
    await expect(countBadge).toHaveText('1');
  });
});
