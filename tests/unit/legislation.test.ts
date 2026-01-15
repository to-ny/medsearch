import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { readFileSync } from 'fs';
import { parseFindLegislationTextResponse } from '@/lib/soap/xml-parser';
import { buildFindLegislationTextRequest } from '@/lib/soap/xml-builder';
import {
  getLegalText,
  getLegalBasisTitle,
  flattenLegalTexts,
} from '@/lib/services/legislation';
import type { LegalBasis, LegalReference, LocalizedText } from '@/lib/types';

const fixturesPath = join(__dirname, '../fixtures/soap');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesPath, name), 'utf-8');
}

describe('Legislation XML Builder', () => {
  describe('buildFindLegislationTextRequest', () => {
    it('should build request with CNK code', () => {
      const xml = buildFindLegislationTextRequest({ cnk: '3621109' });

      expect(xml).toContain('<ns:FindLegislationTextRequest');
      expect(xml).toContain('<FindByDmpp>');
      expect(xml).toContain('<DeliveryEnvironment>P</DeliveryEnvironment>');
      expect(xml).toContain('<Code>3621109</Code>');
      expect(xml).toContain('<CodeType>CNK</CodeType>');
    });

    it('should build request with legal reference path', () => {
      const xml = buildFindLegislationTextRequest({
        legalReferencePath: 'RD20180201-IV-10680000',
      });

      expect(xml).toContain('<ns:FindLegislationTextRequest');
      expect(xml).toContain(
        '<FindByLegalReferencePath>RD20180201-IV-10680000</FindByLegalReferencePath>'
      );
    });

    it('should build request for all legal bases', () => {
      const xml = buildFindLegislationTextRequest({ findAllLegalBases: true });

      expect(xml).toContain('<ns:FindLegislationTextRequest');
      expect(xml).toContain('<FindLegalBases/>');
    });

    it('should escape special XML characters', () => {
      const xml = buildFindLegislationTextRequest({
        legalReferencePath: 'RD<>&test',
      });

      expect(xml).toContain('RD&lt;&gt;&amp;test');
    });
  });
});

describe('Legislation XML Parser', () => {
  describe('parseFindLegislationTextResponse', () => {
    it('should parse valid legislation response', () => {
      const xml = loadFixture('findlegislationtext-cnk-response.xml');
      const result = parseFindLegislationTextResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(1);
      expect(result.searchDate).toBe('2025-01-15');
    });

    it('should extract LegalBasis attributes', () => {
      const xml = loadFixture('findlegislationtext-cnk-response.xml');
      const result = parseFindLegislationTextResponse(xml);

      const legalBasis = result.data![0];
      expect(legalBasis['@_Key']).toBe('RD20180201');
      expect(legalBasis['@_StartDate']).toBe('2018-04-01');
      expect(legalBasis.Type).toBe('ROYAL_DECREE');
      expect(legalBasis.EffectiveOn).toBe('2018-04-01');
    });

    it('should extract Title with multiple languages', () => {
      const xml = loadFixture('findlegislationtext-cnk-response.xml');
      const result = parseFindLegislationTextResponse(xml);

      const title = result.data![0].Title;
      expect(title).toBeDefined();
      expect(title?.Text).toBeDefined();
      expect(title!.Text!.length).toBe(4); // fr, nl, de, en
    });

    it('should parse nested LegalReference hierarchy', () => {
      const xml = loadFixture('findlegislationtext-cnk-response.xml');
      const result = parseFindLegislationTextResponse(xml);

      const legalRefs = result.data![0].LegalReference;
      expect(legalRefs).toBeDefined();
      expect(Array.isArray(legalRefs)).toBe(true);
      expect(legalRefs!.length).toBe(1);

      // Chapter IV
      const chapter = legalRefs![0];
      expect(chapter['@_Key']).toBe('IV');
      expect(chapter.Type).toBe('CHAPTER');

      // Paragraph 10680000
      const paragraph = chapter.LegalReference![0];
      // Key may be parsed as number or string depending on XML content
      expect(String(paragraph['@_Key'])).toBe('10680000');
      expect(paragraph.Type).toBe('PARAGRAPH');
    });

    it('should parse LegalText with hierarchy', () => {
      const xml = loadFixture('findlegislationtext-cnk-response.xml');
      const result = parseFindLegislationTextResponse(xml);

      const paragraph = result.data![0].LegalReference![0].LegalReference![0];
      const legalTexts = paragraph.LegalText;
      expect(legalTexts).toBeDefined();
      expect(legalTexts!.length).toBe(1);

      const topText = legalTexts![0];
      // Key may be parsed as number or string depending on XML content
      expect(String(topText['@_Key'])).toBe('103264');
      expect(topText.Type).toBe('ALINEA');
      expect(topText.SequenceNr).toBe(1);

      // Check nested texts
      expect(topText.LegalText).toBeDefined();
      expect(topText.LegalText!.length).toBe(1);
    });

    it('should handle no results found (code 1007) as empty array', () => {
      const xml = loadFixture('findlegislationtext-noresults-response.xml');
      const result = parseFindLegislationTextResponse(xml);

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

      const result = parseFindLegislationTextResponse(xml);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOAP_FAULT');
    });

    it('should handle invalid XML', () => {
      const result = parseFindLegislationTextResponse('not xml at all');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should handle empty response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ns4:FindLegislationTextResponse xmlns:ns4="urn:be:fgov:ehealth:dics:protocol:v5">
            </ns4:FindLegislationTextResponse>
          </soap:Body>
        </soap:Envelope>`;

      const result = parseFindLegislationTextResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});

describe('Legislation Service', () => {
  describe('getLegalText', () => {
    const sampleTexts: LocalizedText[] = [
      { text: 'Dutch text', language: 'nl' },
      { text: 'French text', language: 'fr' },
      { text: 'English text', language: 'en' },
    ];

    it('should return text for preferred language', () => {
      expect(getLegalText(sampleTexts, 'nl')).toBe('Dutch text');
      expect(getLegalText(sampleTexts, 'fr')).toBe('French text');
      expect(getLegalText(sampleTexts, 'en')).toBe('English text');
    });

    it('should fall back to French for unknown language (most complete for legal texts)', () => {
      expect(getLegalText(sampleTexts, 'de')).toBe('French text');
    });

    it('should fall back to Dutch when French not available', () => {
      const noFrench: LocalizedText[] = [
        { text: 'Dutch only', language: 'nl' },
        { text: 'German text', language: 'de' },
      ];

      expect(getLegalText(noFrench, 'en')).toBe('Dutch only');
    });

    it('should fall back to German when French and Dutch not available', () => {
      const onlyGerman: LocalizedText[] = [{ text: 'German only', language: 'de' }];

      expect(getLegalText(onlyGerman, 'en')).toBe('German only');
    });

    it('should return empty string for undefined input', () => {
      expect(getLegalText(undefined)).toBe('');
    });

    it('should return empty string for empty array', () => {
      expect(getLegalText([])).toBe('');
    });
  });

  describe('getLegalBasisTitle', () => {
    it('should return title from localized text', () => {
      const basis: LegalBasis = {
        key: 'RD20180201',
        title: [
          { text: 'A.R. 01.02.2018', language: 'fr' },
          { text: 'K.B. 01.02.2018', language: 'nl' },
        ],
        type: 'ROYAL_DECREE',
        legalReferences: [],
      };

      expect(getLegalBasisTitle(basis, 'fr')).toBe('A.R. 01.02.2018');
      expect(getLegalBasisTitle(basis, 'nl')).toBe('K.B. 01.02.2018');
    });

    it('should parse title from key when no localized title', () => {
      const basis: LegalBasis = {
        key: 'RD20180201',
        title: [],
        type: 'ROYAL_DECREE',
        legalReferences: [],
      };

      expect(getLegalBasisTitle(basis)).toBe('Royal Decree 01.02.2018');
    });

    it('should return key as fallback for invalid format', () => {
      const basis: LegalBasis = {
        key: 'UNKNOWN',
        title: [],
        type: 'OTHER',
        legalReferences: [],
      };

      expect(getLegalBasisTitle(basis)).toBe('UNKNOWN');
    });
  });

  describe('flattenLegalTexts', () => {
    it('should flatten nested legal texts from a reference', () => {
      const ref: LegalReference = {
        key: 'TEST',
        title: [],
        type: 'PARAGRAPH',
        legalTexts: [
          {
            key: 'T1',
            content: [{ text: 'First', language: 'en' }],
            type: 'ALINEA',
            sequenceNr: 1,
            children: [
              {
                key: 'T2',
                content: [{ text: 'Second', language: 'en' }],
                type: 'POINT',
                sequenceNr: 2,
              },
            ],
          },
        ],
      };

      const flattened = flattenLegalTexts(ref);

      expect(flattened.length).toBe(2);
      expect(flattened[0].key).toBe('T1');
      expect(flattened[1].key).toBe('T2');
    });

    it('should handle references with no legal texts', () => {
      const ref: LegalReference = {
        key: 'TEST',
        title: [],
        type: 'CHAPTER',
        legalReferences: [],
      };

      const flattened = flattenLegalTexts(ref);

      expect(flattened).toEqual([]);
    });

    it('should recurse into child references', () => {
      const ref: LegalReference = {
        key: 'CHAPTER',
        title: [],
        type: 'CHAPTER',
        legalReferences: [
          {
            key: 'PARAGRAPH',
            title: [],
            type: 'PARAGRAPH',
            legalTexts: [
              {
                key: 'T1',
                content: [{ text: 'Text', language: 'en' }],
                type: 'ALINEA',
                sequenceNr: 1,
              },
            ],
          },
        ],
      };

      const flattened = flattenLegalTexts(ref);

      expect(flattened.length).toBe(1);
      expect(flattened[0].key).toBe('T1');
    });
  });
});
