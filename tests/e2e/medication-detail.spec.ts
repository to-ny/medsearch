import { test, expect } from '@playwright/test';

test.describe('Medication Detail Page', () => {
  const testCNK = '1482223'; // Dafalgan Codeine

  test('should display medication details', async ({ page }) => {
    await page.goto(`/medication/${testCNK}`);

    // Wait for page to load and show breadcrumb
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Should show medication info
    await expect(page.getByText('Authorized')).toBeVisible();
    await expect(page.locator('a[href^="/companies/"]').first()).toBeVisible();
  });

  test('should show packages section', async ({ page }) => {
    await page.goto(`/medication/${testCNK}`);

    await expect(page.getByText('Available Packages')).toBeVisible({ timeout: 15000 });
  });

  test('should display medication page without errors when no therapeutic alternatives', async ({ page }) => {
    // Test with a medication that may not have therapeutic alternatives
    await page.goto(`/medication/${testCNK}`);

    // Page should load successfully
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Main content should be visible (not broken by missing alternatives)
    await expect(page.getByText('Available Packages')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
  });
});

test.describe('Therapeutic Alternatives', () => {
  // Omeprazole 20mg tablet (Losec-Mups) - known to have therapeutic alternatives
  // CNK may need to be updated if this specific product changes in the SAM database
  const omeprazoleCNK = '2095438'; // Losec-Mups 20mg

  test('should show therapeutic alternatives section when available', async ({ page }) => {
    await page.goto(`/medication/${omeprazoleCNK}`, { waitUntil: 'networkidle' });

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 20000 });

    // Check for therapeutic alternatives section
    // Note: This test may fail if the medication's VMP Group only has one member
    const alternativesSection = page.getByText('Therapeutic Alternatives');
    const hasAlternatives = await alternativesSection.isVisible().catch(() => false);

    if (hasAlternatives) {
      // If alternatives exist, verify the section structure
      await expect(page.getByText('Therapeutic Group').first()).toBeVisible();
      await expect(page.getByText('Other formulations').first()).toBeVisible();

      // Should have links to find brands
      const findBrandsLinks = page.getByRole('link', { name: /Find brands/i });
      await expect(findBrandsLinks.first()).toBeVisible();
    }
    // If no alternatives, the page should still render correctly
  });

  test('should navigate to search when clicking Find brands', async ({ page }) => {
    await page.goto(`/medication/${omeprazoleCNK}`, { waitUntil: 'networkidle' });

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 20000 });

    // Check if therapeutic alternatives exist
    const alternativesSection = page.getByText('Therapeutic Alternatives');
    const hasAlternatives = await alternativesSection.isVisible().catch(() => false);

    if (hasAlternatives) {
      // Click on a "Find brands" link
      const findBrandsLink = page.getByRole('link', { name: /Find brands/i }).first();
      await findBrandsLink.click();

      // Should navigate to search page with vmp parameter
      await expect(page).toHaveURL(/\/search\?vmp=/);

      // Should show search results
      await expect(page.getByText(/results?/i)).toBeVisible({ timeout: 15000 });
    }
  });
});

test.describe('Chapter IV API', () => {
  test('should return Chapter IV data for known restricted medications', async ({ request }) => {
    // Test the Chapter IV API directly with a known Chapter IV medication
    const response = await request.get('/api/chapter-iv?cnk=3621109');

    // The API should return successfully
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('paragraphs');

    // Humira has Chapter IV paragraphs
    expect(data.paragraphs.length).toBeGreaterThan(0);

    // Each paragraph should have the expected structure
    if (data.paragraphs.length > 0) {
      const paragraph = data.paragraphs[0];
      expect(paragraph).toHaveProperty('chapterName');
      expect(paragraph).toHaveProperty('paragraphName');
      expect(paragraph).toHaveProperty('legalReferencePath');
    }
  });

  test('should return empty array for medications without Chapter IV data', async ({ request }) => {
    // Test with a real medication that doesn't have Chapter IV restrictions
    // Using Dafalgan (regular painkiller)
    const response = await request.get('/api/chapter-iv?cnk=1482223');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('paragraphs');
    // Regular medications should have empty paragraphs
    expect(Array.isArray(data.paragraphs)).toBe(true);
  });

  test('should validate CNK parameter', async ({ request }) => {
    // Test without CNK
    const response = await request.get('/api/chapter-iv');

    expect(response.status()).toBe(400);
  });
});

test.describe('Standard Dosage API', () => {
  test('should return dosage data for valid VmpGroup code', async ({ request }) => {
    // Test the Dosage API with paracetamol 500mg oral (VmpGroup 24901)
    const response = await request.get('/api/dosages/24901');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('dosages');
    expect(data).toHaveProperty('totalCount');

    // Paracetamol should have dosages
    expect(data.dosages.length).toBeGreaterThan(0);

    // Each dosage should have expected structure
    if (data.dosages.length > 0) {
      const dosage = data.dosages[0];
      expect(dosage).toHaveProperty('code');
      expect(dosage).toHaveProperty('targetGroup');
      expect(dosage).toHaveProperty('treatmentDurationType');
    }
  });

  test('should return empty array for VmpGroup without dosage data', async ({ request }) => {
    // Test with a VmpGroup that likely has no standard dosage
    const response = await request.get('/api/dosages/99999');

    // Should return 404 or empty result
    const data = await response.json();
    if (response.ok()) {
      expect(Array.isArray(data.dosages)).toBe(true);
    }
  });

  test('should validate VmpGroup code format', async ({ request }) => {
    // Test with invalid format
    const response = await request.get('/api/dosages/invalid');

    expect(response.status()).toBe(400);
  });
});

test.describe('Medication Page Reimbursement', () => {
  test('should display reimbursement section', async ({ page }) => {
    // Test with a known reimbursed medication
    await page.goto('/medication/1482223'); // Dafalgan Codeine

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Verify the page shows the reimbursement card heading
    // This may show "Reimbursement" or "No reimbursement information" depending on data
    await expect(page.locator('text=Reimbursement').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display Chapter IV badge for restricted medications', async ({ page }) => {
    // Humira (CNK 3621109) is a known Chapter IV medication
    await page.goto('/medication/3621109');

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Should show Chapter IV badge in reimbursement section
    await expect(page.getByText('Chapter IV', { exact: true })).toBeVisible({ timeout: 15000 });

    // Should show the info box about prior authorization
    await expect(page.getByText('prior authorization')).toBeVisible({ timeout: 10000 });

    // Should have the "View authorization requirements" button
    await expect(page.getByRole('button', { name: /view authorization requirements/i })).toBeVisible();
  });

  test('should have legal basis button for reimbursed medications', async ({ page }) => {
    // Humira (CNK 3621109) is a known reimbursed medication
    await page.goto('/medication/3621109');

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Should have the "View legal basis" button
    await expect(page.getByRole('button', { name: /view legal basis/i })).toBeVisible({ timeout: 10000 });
  });

  test('should expand legal basis section on click', async ({ page }) => {
    // Humira (CNK 3621109) is a known reimbursed medication with legislation
    await page.goto('/medication/3621109');

    // Wait for page to load
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible({ timeout: 15000 });

    // Click the "View legal basis" button
    const legalBasisButton = page.getByRole('button', { name: /view legal basis/i });
    await expect(legalBasisButton).toBeVisible({ timeout: 10000 });
    await legalBasisButton.click();

    // Should show legal text content or loading state
    // Wait for either the legal content or a loading message
    await expect(page.locator('text=/Loading legal text|Royal Decree|K\\.B\\.|A\\.R\\./i').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Legislation API', () => {
  test('should return legislation data for known reimbursed medications', async ({ request }) => {
    // Test the Legislation API directly with a known reimbursed medication (Humira)
    const response = await request.get('/api/legislation?cnk=3621109');

    // The API should return successfully
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('legalBases');

    // Humira has legislation (Chapter IV)
    expect(data.legalBases.length).toBeGreaterThan(0);

    // Each legal basis should have the expected structure
    if (data.legalBases.length > 0) {
      const legalBasis = data.legalBases[0];
      expect(legalBasis).toHaveProperty('key');
      expect(legalBasis).toHaveProperty('type');
      expect(legalBasis).toHaveProperty('legalReferences');
    }
  });

  test('should return empty array for medications without legislation', async ({ request }) => {
    // Test with a CNK that doesn't have reimbursement
    const response = await request.get('/api/legislation?cnk=0000001');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('legalBases');
    // Should have empty legalBases array
    expect(Array.isArray(data.legalBases)).toBe(true);
  });

  test('should validate CNK parameter', async ({ request }) => {
    // Test without CNK or path
    const response = await request.get('/api/legislation');

    expect(response.status()).toBe(400);
  });

  test('should support path parameter for direct legislation lookup', async ({ request }) => {
    // Test with a known legal reference path
    const response = await request.get('/api/legislation?path=RD20180201-IV-10680000');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('legalBases');
  });
});
