import { test, expect } from '@playwright/test';

test('search API returns JSON array of results', async ({ request }) => {
  const response = await request.get('/api/search?q=paracetamol');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');

  const data = await response.json();
  const results = Array.isArray(data) ? data : data.results;
  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBeGreaterThan(0);
});

test('search API handles XSS attempts safely', async ({ request }) => {
  const response = await request.get('/api/search?q=' + encodeURIComponent('<script>alert(1)</script>'));

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/json');
});
