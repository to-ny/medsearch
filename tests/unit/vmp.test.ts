import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getVmpDetail, searchVmp, getVmpGroup, getVmpsInGroup, getEquivalentMedications } from '@/lib/services/vmp';
import * as soapClient from '@/lib/soap/client';

const fixturesPath = join(__dirname, '../fixtures/soap');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesPath, name), 'utf-8');
}

describe('VMP Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVmpDetail', () => {
    it('should return VMP with non-empty name', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // THIS TEST WOULD HAVE CAUGHT THE BUG
      expect(result.data!.name).not.toBe('');
      expect(result.data!.name.length).toBeGreaterThan(0);
    });

    it('should return VMP with correct vmpCode', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      // vmpCode is converted to string in transformation
      expect(result.data!.vmpCode).toBe(26666);
    });

    it('should return VMP with non-empty vmpGroup name', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      expect(result.data!.vmpGroup).toBeDefined();
      // THIS TEST WOULD HAVE CAUGHT THE BUG
      expect(result.data!.vmpGroup!.name).not.toBe('');
    });

    it('should return VMP with components containing ingredients', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      expect(result.data!.components).toBeDefined();
      expect(result.data!.components.length).toBeGreaterThan(0);
      expect(result.data!.components[0].ingredients.length).toBeGreaterThan(0);
    });

    it('should return ingredients with non-empty substance names', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      const ingredients = result.data!.components[0].ingredients;
      // THIS TEST WOULD HAVE CAUGHT THE BUG
      for (const ingredient of ingredients) {
        expect(ingredient.substanceName).not.toBe('');
        expect(ingredient.substanceName.length).toBeGreaterThan(0);
      }
    });

    it('should extract text in preferred language', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'fr');

      // French text should contain French-specific characters/words
      expect(result.data!.name).toContain('paracétamol');
    });

    it('should return NOT_FOUND for empty VMP response', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindVmpResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindVmpResponse>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(emptyXml);

      const result = await getVmpDetail('99999', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle SOAP fault', async () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>No VMP found</faultstring>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(faultXml);

      const result = await getVmpDetail('99999', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });

    it('should handle network errors', async () => {
      vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Network error'));

      const result = await getVmpDetail('26666', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_FAILED');
    });
  });

  describe('searchVmp', () => {
    it('should search by name and return results with names', async () => {
      const fixtureXml = loadFixture('findvmp-anyNamePart-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await searchVmp({ query: 'paracetamol', language: 'nl' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);

      // All results should have non-empty names
      for (const vmp of result.data!) {
        expect(vmp.name).not.toBe('');
      }
    });

    it('should include meta information', async () => {
      const fixtureXml = loadFixture('findvmp-anyNamePart-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await searchVmp({ query: 'paracetamol' });

      expect(result.meta).toBeDefined();
      expect(result.meta!.totalResults).toBeGreaterThan(0);
    });
  });

  describe('Data transformation contracts', () => {
    it('should never return empty name when source has Name element', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      // Contract: transformed data must have populated name
      expect(result.data!.name).toBeTruthy();
      expect(result.data!.name.length).toBeGreaterThan(0);
    });

    it('should preserve all ingredient data', async () => {
      const fixtureXml = loadFixture('findvmp-vmpCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpDetail('26666', 'nl');

      const ingredients = result.data!.components.flatMap(c => c.ingredients);

      for (const ing of ingredients) {
        expect(ing.rank).toBeGreaterThan(0);
        expect(ing.type).toBeTruthy();
        expect(ing.substanceCode).toBeTruthy();
        expect(ing.substanceName).toBeTruthy();
      }
    });
  });

  describe('getVmpGroup', () => {
    it('should return VMP Group with non-empty name', async () => {
      const fixtureXml = loadFixture('findvmpgroup-code-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpGroup('24877', 'nl');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).not.toBe('');
      expect(result.data!.name).toContain('omeprazol');
    });

    it('should return VMP Group with correct code', async () => {
      const fixtureXml = loadFixture('findvmpgroup-code-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpGroup('24877', 'nl');

      expect(result.data!.code).toBe('24877');
    });

    it('should include noSwitchReason when present', async () => {
      const fixtureXml = loadFixture('findvmpgroup-code-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpGroup('24877', 'nl');

      expect(result.data!.noSwitchReason).toBe('NARROW_THERAPEUTIC_INDEX');
    });

    it('should return NOT_FOUND for empty response', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindVmpGroupResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindVmpGroupResponse>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(emptyXml);

      const result = await getVmpGroup('99999', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle network errors', async () => {
      vi.spyOn(soapClient, 'soapRequest').mockRejectedValue(new Error('Network error'));

      const result = await getVmpGroup('24877', 'en');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_FAILED');
    });
  });

  describe('getVmpsInGroup', () => {
    it('should return all VMPs in a group', async () => {
      const fixtureXml = loadFixture('findvmp-vmpGroupCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpsInGroup('24877', 'nl');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(2);
    });

    it('should return VMP members with non-empty names', async () => {
      const fixtureXml = loadFixture('findvmp-vmpGroupCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpsInGroup('24877', 'nl');

      for (const vmp of result.data!) {
        expect(vmp.name).not.toBe('');
        expect(vmp.vmpCode).not.toBe('');
      }
    });

    it('should return VMP members with correct vmpCodes', async () => {
      const fixtureXml = loadFixture('findvmp-vmpGroupCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpsInGroup('24877', 'nl');

      const codes = result.data!.map(v => v.vmpCode);
      expect(codes).toContain('25502');
      expect(codes).toContain('25510');
    });

    it('should include meta with totalResults', async () => {
      const fixtureXml = loadFixture('findvmp-vmpGroupCode-response.xml');
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(fixtureXml);

      const result = await getVmpsInGroup('24877', 'nl');

      expect(result.meta?.totalResults).toBe(2);
    });
  });

  describe('getEquivalentMedications', () => {
    it('should return equivalent medications with group info', async () => {
      const vmpFixture = loadFixture('findvmp-vmpCode-response.xml');
      const groupFixture = loadFixture('findvmpgroup-code-response.xml');
      const membersFixture = loadFixture('findvmp-vmpGroupCode-response.xml');

      // Mock based on request content to handle parallel calls
      vi.spyOn(soapClient, 'soapRequest').mockImplementation(async (_endpoint, soapXml) => {
        // First call gets VMP detail (FindVmpRequest with VmpCode)
        if (soapXml.includes('FindVmpRequest') && soapXml.includes('<VmpCode>')) {
          return vmpFixture;
        }
        // FindVmpGroupRequest - get group details
        if (soapXml.includes('FindVmpGroupRequest')) {
          return groupFixture;
        }
        // FindVmpRequest with GenericPrescriptionGroupCode - get members
        if (soapXml.includes('FindVmpRequest') && soapXml.includes('GenericPrescriptionGroupCode')) {
          return membersFixture;
        }
        throw new Error(`Unexpected SOAP request: ${soapXml.substring(0, 200)}`);
      });

      const result = await getEquivalentMedications('26666', 'nl');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.group).toBeDefined();
      expect(result.data!.equivalents).toBeDefined();
      expect(result.data!.currentVmpCode).toBe('26666');
    });

    it('should return NO_GROUP error for VMP without group', async () => {
      // VMP response without VmpGroup
      const noGroupXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindVmpResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
              <Vmp Code="99999" StartDate="2020-01-01">
                <Name>
                  <Text xml:lang="nl">Test VMP zonder groep</Text>
                </Name>
              </Vmp>
            </ns4:FindVmpResponse>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(noGroupXml);

      const result = await getEquivalentMedications('99999', 'nl');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_GROUP');
    });

    it('should handle VMP not found error', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindVmpResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindVmpResponse>
          </soap:Body>
        </soap:Envelope>`;
      vi.spyOn(soapClient, 'soapRequest').mockResolvedValue(emptyXml);

      const result = await getEquivalentMedications('99999', 'nl');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
});
