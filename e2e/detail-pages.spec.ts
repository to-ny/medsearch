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

  // Sidebar should show validity status (Active or Expired)
  await expect(page.locator('main')).toContainText(/Active|Expired/);
});

test('AMP sidebar shows reimbursable percentage', async ({ page }) => {
  // Chlorure de Sodium Aguettant - has many reimbursable packages
  await page.goto('/en/medications/SAM208966-00');
  await page.waitForLoadState('networkidle');

  // Sidebar should show reimbursable percentage
  await expect(page.locator('main')).toContainText(/%/);
});

test('VTM sidebar shows package count', async ({ page }) => {
  // paracetamol - has many packages
  await page.goto('/en/substances/974');
  await page.waitForLoadState('networkidle');

  // Sidebar should show package count
  await expect(page.locator('main')).toContainText(/Package/i);
});

test('ATC sidebar shows level indicator', async ({ page }) => {
  // Atorvastatin - C10AA05 (level 5)
  await page.goto('/en/classifications/C10AA05');
  await page.waitForLoadState('networkidle');

  // Sidebar should show ATC level
  await expect(page.locator('main')).toContainText(/Level/i);
});

test('Company sidebar shows product statistics', async ({ page }) => {
  // Boiron - has multiple products
  await page.goto('/en/companies/02605');
  await page.waitForLoadState('networkidle');

  // Sidebar should show product count, generic count, package count
  await expect(page.locator('main')).toContainText(/Product|Generic|Package/i);
});

test('VMP Group sidebar shows validity indicator', async ({ page }) => {
  // lenograstim group
  await page.goto('/en/therapeutic-groups/18689');
  await page.waitForLoadState('networkidle');

  // Sidebar should show validity status
  await expect(page.locator('main')).toContainText(/Active|Expired/);
});
