import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseFindAmpResponse,
  parseFindVmpResponse,
  parseFindCompanyResponse,
  parseFindReimbursementResponse,
  parseFindAtcResponse,
  extractText,
  extractTextWithLang,
  extractAllTextVersions,
  getTextArray,
} from '@/lib/soap/xml-parser';

const fixturesPath = join(__dirname, '../fixtures/soap');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesPath, name), 'utf-8');
}

describe('XML Parser', () => {
  describe('getTextArray', () => {
    it('should unwrap {Text: [...]} structure', () => {
      const wrapped = { Text: [{ '@_xml:lang': 'en', '#text': 'Hello' }] };
      const result = getTextArray(wrapped);

      expect(result).toEqual([{ '@_xml:lang': 'en', '#text': 'Hello' }]);
    });

    it('should pass through direct arrays', () => {
      const direct = [{ '@_xml:lang': 'en', '#text': 'Hello' }];
      const result = getTextArray(direct);

      expect(result).toEqual(direct);
    });

    it('should return undefined for undefined input', () => {
      expect(getTextArray(undefined)).toBeUndefined();
    });

    it('should return undefined for string input', () => {
      expect(getTextArray('plain string')).toBeUndefined();
    });
  });

  describe('extractText', () => {
    it('should extract text by preferred language', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'fr', '#text': 'French text' },
        { '@_xml:lang': 'en', '#text': 'English text' },
      ];

      expect(extractText(texts, 'en')).toBe('English text');
      expect(extractText(texts, 'nl')).toBe('Dutch text');
      expect(extractText(texts, 'fr')).toBe('French text');
    });

    it('should fall back to English when preferred language not found', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'en', '#text': 'English text' },
      ];

      expect(extractText(texts, 'de')).toBe('English text');
    });

    it('should fall back to first available when no English', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'fr', '#text': 'French text' },
      ];

      expect(extractText(texts, 'de')).toBe('Dutch text');
    });

    it('should handle @_lang attribute (alternative format)', () => {
      const texts = [
        { '@_lang': 'en', '#text': 'English text' },
      ];

      expect(extractText(texts, 'en')).toBe('English text');
    });

    it('should return empty string for undefined input', () => {
      expect(extractText(undefined)).toBe('');
    });

    it('should return string directly if input is string', () => {
      expect(extractText('direct string')).toBe('direct string');
    });
  });

  describe('extractTextWithLang', () => {
    it('should return text and language when preferred language found', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'en', '#text': 'English text' },
      ];

      const result = extractTextWithLang(texts, 'en');
      expect(result.text).toBe('English text');
      expect(result.language).toBe('en');
    });

    it('should return fallback language when preferred not found', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'fr', '#text': 'French text' },
      ];

      const result = extractTextWithLang(texts, 'de');
      // Falls back to first available (nl)
      expect(result.text).toBe('Dutch text');
      expect(result.language).toBe('nl');
    });

    it('should return empty result for undefined input', () => {
      const result = extractTextWithLang(undefined, 'en');
      expect(result.text).toBe('');
      expect(result.language).toBe('en');
    });
  });

  describe('extractAllTextVersions', () => {
    it('should return all language versions', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'fr', '#text': 'French text' },
        { '@_xml:lang': 'en', '#text': 'English text' },
      ];

      const result = extractAllTextVersions(texts);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ text: 'Dutch text', language: 'nl' });
      expect(result).toContainEqual({ text: 'French text', language: 'fr' });
      expect(result).toContainEqual({ text: 'English text', language: 'en' });
    });

    it('should handle @_lang attribute', () => {
      const texts = [
        { '@_lang': 'en', '#text': 'English text' },
        { '@_lang': 'de', '#text': 'German text' },
      ];

      const result = extractAllTextVersions(texts);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ text: 'English text', language: 'en' });
      expect(result).toContainEqual({ text: 'German text', language: 'de' });
    });

    it('should return empty array for undefined input', () => {
      const result = extractAllTextVersions(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out entries without text', () => {
      const texts = [
        { '@_xml:lang': 'nl', '#text': 'Dutch text' },
        { '@_xml:lang': 'fr' }, // No #text
        { '@_xml:lang': 'en', '#text': '' }, // Empty text is filtered
      ];

      const result = extractAllTextVersions(texts);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ text: 'Dutch text', language: 'nl' });
    });

    it('should handle string input', () => {
      const result = extractAllTextVersions('plain string');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ text: 'plain string', language: 'en' });
    });
  });

  describe('parseFindAmpResponse', () => {
    it('should parse AMP response by CNK', () => {
      const xml = loadFixture('findamp-cnk-response.xml');
      const result = parseFindAmpResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.searchDate).toBeDefined();
      expect(result.samId).toBeDefined();
    });

    it('should extract AMP code attribute', () => {
      const xml = loadFixture('findamp-cnk-response.xml');
      const result = parseFindAmpResponse(xml);

      expect(result.data![0]['@_Code']).toMatch(/^SAM\d+-\d+$/);
    });

    it('should extract VmpCode attribute from AMP', () => {
      const xml = loadFixture('findamp-cnk-response.xml');
      const result = parseFindAmpResponse(xml);

      expect(result.data![0]['@_VmpCode']).toBeDefined();
      expect(typeof result.data![0]['@_VmpCode']).toBe('number');
    });

    it('should parse Name with Text elements', () => {
      const xml = loadFixture('findamp-cnk-response.xml');
      const result = parseFindAmpResponse(xml);

      const name = result.data![0].Name;
      expect(name).toBeDefined();
      // Name contains Text array - use getTextArray to unwrap
      const textArray = getTextArray(name);
      expect(textArray).toBeDefined();
      expect(textArray!.length).toBeGreaterThan(0);
    });

    it('should parse nested Ampp and Dmpp arrays', () => {
      const xml = loadFixture('findamp-cnk-response.xml');
      const result = parseFindAmpResponse(xml);

      const amp = result.data![0];
      expect(amp.Ampp).toBeDefined();
      expect(Array.isArray(amp.Ampp)).toBe(true);
      expect(amp.Ampp![0].Dmpp).toBeDefined();
    });

    it('should handle SOAP fault response', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAmpResponse(faultXml);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });

    it('should handle business error 1004 (no company found) as empty results', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:soa:v1">
                  <Code>1004</Code>
                  <Message xml:lang="en">No company found for given criteria.</Message>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAmpResponse(faultXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle business error 1008 (no results) as empty results', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:soa:v1">
                  <Code>1008</Code>
                  <Message xml:lang="en">No results found.</Message>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAmpResponse(faultXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle invalid XML', () => {
      const result = parseFindAmpResponse('not xml at all');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  describe('parseFindVmpResponse', () => {
    it('should parse VMP response by code', () => {
      const xml = loadFixture('findvmp-vmpCode-response.xml');
      const result = parseFindVmpResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should extract VMP code attribute', () => {
      const xml = loadFixture('findvmp-vmpCode-response.xml');
      const result = parseFindVmpResponse(xml);

      expect(result.data![0]['@_Code']).toBeDefined();
    });

    it('should parse Name with Text elements', () => {
      const xml = loadFixture('findvmp-vmpCode-response.xml');
      const result = parseFindVmpResponse(xml);

      const name = result.data![0].Name;
      expect(name).toBeDefined();
      // Name contains Text array - use getTextArray to unwrap
      const textArray = getTextArray(name);
      expect(textArray).toBeDefined();
      expect(textArray!.length).toBeGreaterThan(0);
    });

    it('should parse VmpGroup with Name', () => {
      const xml = loadFixture('findvmp-vmpCode-response.xml');
      const result = parseFindVmpResponse(xml);

      const vmpGroup = result.data![0].VmpGroup;
      expect(vmpGroup).toBeDefined();
      expect(vmpGroup?.['@_Code']).toBeDefined();
      expect(vmpGroup?.Name).toBeDefined();
    });

    it('should parse VmpComponent with VirtualIngredient', () => {
      const xml = loadFixture('findvmp-vmpCode-response.xml');
      const result = parseFindVmpResponse(xml);

      const components = result.data![0].VmpComponent;
      expect(components).toBeDefined();
      expect(Array.isArray(components)).toBe(true);
      expect(components![0].VirtualIngredient).toBeDefined();
    });

    it('should handle empty response', () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindVmpResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindVmpResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindVmpResponse(emptyXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle business error 1008 (no results) as empty results', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:soa:v1">
                  <Code>1008</Code>
                  <Message xml:lang="en">No results found for given criteria.</Message>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindVmpResponse(faultXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle SOAP fault without business error as failure', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal server error</faultstring>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindVmpResponse(faultXml);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });
  });

  describe('parseFindCompanyResponse', () => {
    it('should parse company response', () => {
      const xml = loadFixture('findcompany-anyNamePart-response.xml');
      const result = parseFindCompanyResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should extract company ActorNr', () => {
      const xml = loadFixture('findcompany-anyNamePart-response.xml');
      const result = parseFindCompanyResponse(xml);

      expect(result.data![0]['@_ActorNr']).toBeDefined();
    });

    it('should handle business error 1004 (no company found) as empty results', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:soa:v1">
                  <Code>1004</Code>
                  <Message xml:lang="en">No company found for given criteria.</Message>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindCompanyResponse(faultXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle business error 1008 (no results) as empty results', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal error</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:soa:v1">
                  <Code>1008</Code>
                  <Message xml:lang="en">No results found for given criteria.</Message>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindCompanyResponse(faultXml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle SOAP fault without business error as failure', () => {
      const faultXml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal server error</faultstring>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindCompanyResponse(faultXml);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });
  });

  describe('parseFindReimbursementResponse', () => {
    it('should handle no reimbursement found (code 1008) as empty results', () => {
      const xml = loadFixture('findreimbursement-cnk-response.xml');
      const result = parseFindReimbursementResponse(xml);

      // The SAM API returns SOAP fault code 1008 when no reimbursements exist
      // We treat this as success with empty data (medication simply isn't reimbursed)
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('parseFindAtcResponse', () => {
    it('should parse valid ATC classification response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindCommentedClassificationResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5"
              SearchDate="2024-01-01" SamId="12345">
              <CommentedClassification>
                <CommentedClassificationCode>A</CommentedClassificationCode>
                <Title>
                  <Text xml:lang="en">Alimentary tract and metabolism</Text>
                  <Text xml:lang="nl">Spijsverteringskanaal en stofwisseling</Text>
                </Title>
              </CommentedClassification>
              <CommentedClassification>
                <CommentedClassificationCode>A01</CommentedClassificationCode>
                <Title>
                  <Text xml:lang="en">Stomatological preparations</Text>
                </Title>
              </CommentedClassification>
            </ns4:FindCommentedClassificationResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(2);
      expect(result.searchDate).toBe('2024-01-01');
      // samId may be parsed as number or string depending on XML parser config
      expect(String(result.samId)).toBe('12345');
    });

    it('should extract CommentedClassificationCode', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindCommentedClassificationResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
              <CommentedClassification>
                <CommentedClassificationCode>N02BE01</CommentedClassificationCode>
                <Title>
                  <Text xml:lang="en">Paracetamol</Text>
                </Title>
              </CommentedClassification>
            </ns4:FindCommentedClassificationResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data![0].CommentedClassificationCode).toBe('N02BE01');
    });

    it('should extract Title with multiple languages', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindCommentedClassificationResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
              <CommentedClassification>
                <CommentedClassificationCode>A</CommentedClassificationCode>
                <Title>
                  <Text xml:lang="en">Alimentary tract</Text>
                  <Text xml:lang="nl">Spijsvertering</Text>
                  <Text xml:lang="fr">Voies digestives</Text>
                </Title>
              </CommentedClassification>
            </ns4:FindCommentedClassificationResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data![0].Title).toBeDefined();

      const textArray = getTextArray(result.data![0].Title);
      expect(textArray).toBeDefined();
      expect(textArray!.length).toBe(3);
    });

    it('should handle no results found (code 1008) as empty array', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>no results</faultstring>
              <detail>
                <ns2:BusinessError xmlns:ns2="urn:be:fgov:ehealth:errors:service:v1">
                  <Code>1008</Code>
                </ns2:BusinessError>
              </detail>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle SOAP fault response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <soap:Fault>
              <faultcode>soap:Server</faultcode>
              <faultstring>Internal server error</faultstring>
            </soap:Fault>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });

    it('should handle invalid XML', () => {
      const result = parseFindAtcResponse('not xml at all');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should handle empty response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindCommentedClassificationResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindCommentedClassificationResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle single classification (not wrapped in array)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindCommentedClassificationResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
              <CommentedClassification>
                <CommentedClassificationCode>B</CommentedClassificationCode>
                <Title>
                  <Text xml:lang="en">Blood</Text>
                </Title>
              </CommentedClassification>
            </ns4:FindCommentedClassificationResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindAtcResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].CommentedClassificationCode).toBe('B');
    });
  });
});
