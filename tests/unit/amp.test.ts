import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAmpDetail, searchAmp, getAmpsByVmp } from '@/lib/services/amp';
import * as soapClient from '@/lib/soap/client';

const fixturesPath = join(__dirname, '../fixtures/soap');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesPath, name), 'utf-8');
}

describe('AMP Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAmpDetail', () => {
    it('should return medication with non-empty name', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).not.toBe('');
      expect(result.data!.name.length).toBeGreaterThan(0);
    });

    it('should extract ampCode correctly', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.data!.ampCode).toMatch(/^SAM\d+-\d+$/);
    });

    it('should extract vmpCode for finding equivalents', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.data!.vmpCode).toBeDefined();
      expect(typeof result.data!.vmpCode).toBe('number');
    });

    it('should parse packages with CNK codes', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.data!.packages).toBeDefined();
      expect(result.data!.packages.length).toBeGreaterThan(0);

      const firstPackage = result.data!.packages[0];
      expect(firstPackage.cnkCodes).toBeDefined();
      expect(firstPackage.cnkCodes.length).toBeGreaterThan(0);
    });

    it('should parse components with ingredients', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.data!.components).toBeDefined();
      expect(result.data!.components.length).toBeGreaterThan(0);

      const firstComponent = result.data!.components[0];
      expect(firstComponent.ingredients).toBeDefined();
      expect(firstComponent.ingredients.length).toBeGreaterThan(0);
    });

    it('should return ingredients with non-empty substance names', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      const ingredients = result.data!.components.flatMap(c => c.ingredients);
      for (const ingredient of ingredients) {
        expect(ingredient.substanceName).not.toBe('');
      }
    });

    it('should handle AMP code format', async () => {
      const fixtureXml = loadFixture('findamp-ampCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('SAM464417-00', 'en');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return NOT_FOUND for empty response', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindAmpResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindAmpResponse>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(emptyXml);

      const result = await getAmpDetail('9999999', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle network errors', async () => {
      vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Timeout'));

      const result = await getAmpDetail('3567237', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_FAILED');
    });
  });

  describe('searchAmp', () => {
    it('should search by name and return results', async () => {
      const fixtureXml = loadFixture('findamp-anyNamePart-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await searchAmp({ query: 'paracetamol', language: 'en' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return search results with non-empty names', async () => {
      const fixtureXml = loadFixture('findamp-anyNamePart-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await searchAmp({ query: 'paracetamol', language: 'en' });

      for (const med of result.data!) {
        expect(med.name).not.toBe('');
      }
    });

    it('should include meta information', async () => {
      const fixtureXml = loadFixture('findamp-anyNamePart-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await searchAmp({ query: 'paracetamol' });

      expect(result.meta).toBeDefined();
      expect(result.meta!.totalResults).toBeGreaterThan(0);
      expect(result.meta!.searchDate).toBeDefined();
    });

    describe('company filter timeout handling', () => {
      it('should return COMPANY_TOO_LARGE for timeout on company-only search', async () => {
        vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Request timeout after 30000ms'));

        const result = await searchAmp({ companyActorNr: '01995', language: 'en' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('COMPANY_TOO_LARGE');
        expect(result.error?.message).toContain('too many products');
      });

      it('should return normal timeout error when query is also provided', async () => {
        vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Request timeout after 30000ms'));

        const result = await searchAmp({ query: 'dafalgan', companyActorNr: '01995', language: 'en' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('REQUEST_FAILED');
      });

      it('should return normal error for non-timeout failures on company search', async () => {
        vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Network connection refused'));

        const result = await searchAmp({ companyActorNr: '01995', language: 'en' });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('REQUEST_FAILED');
      });
    });
  });

  describe('getAmpsByVmp', () => {
    it('should find AMPs by VMP code', async () => {
      const fixtureXml = loadFixture('findamp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpsByVmp('40626', 'en');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Data transformation contracts', () => {
    it('should preserve CNK code structure', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      const cnkCodes = result.data!.packages.flatMap(p => p.cnkCodes);
      for (const cnk of cnkCodes) {
        expect(cnk.code).toBeTruthy();
        expect(['P', 'H']).toContain(cnk.deliveryEnvironment);
      }
    });

    it('should set default status to AUTHORIZED', async () => {
      const fixtureXml = loadFixture('findamp-cnk-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getAmpDetail('3567237', 'en');

      expect(result.data!.status).toBe('AUTHORIZED');
    });
  });
});
