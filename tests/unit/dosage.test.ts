import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFindStandardDosageResponse } from '@/lib/soap/xml-parser';
import { buildFindStandardDosageRequest } from '@/lib/soap/xml-builder';

const fixturesPath = join(__dirname, '../fixtures/soap');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesPath, name), 'utf-8');
}

describe('Standard Dosage', () => {
  describe('XML Builder - buildFindStandardDosageRequest', () => {
    it('should build request with vmpGroupCode', () => {
      const request = buildFindStandardDosageRequest({
        vmpGroupCode: '24901',
      });

      expect(request).toContain('FindStandardDosageRequest');
      expect(request).toContain('<FindByGenericPrescriptionGroup>');
      expect(request).toContain('<GenericPrescriptionGroupCode>24901</GenericPrescriptionGroupCode>');
      expect(request).toContain('IssueInstant');
    });

    it('should build request with anyNamePart', () => {
      const request = buildFindStandardDosageRequest({
        anyNamePart: 'paracetamol',
      });

      expect(request).toContain('FindStandardDosageRequest');
      expect(request).toContain('<FindByGenericPrescriptionGroup>');
      expect(request).toContain('<AnyNamePart>paracetamol</AnyNamePart>');
    });

    it('should escape special XML characters', () => {
      const request = buildFindStandardDosageRequest({
        anyNamePart: 'test & <special> "chars"',
      });

      expect(request).toContain('&amp;');
      expect(request).toContain('&lt;');
      expect(request).toContain('&gt;');
      expect(request).toContain('&quot;');
    });

    it('should build empty body when no parameters provided', () => {
      const request = buildFindStandardDosageRequest({});

      expect(request).toContain('FindStandardDosageRequest');
      expect(request).not.toContain('FindByGenericPrescriptionGroup');
    });
  });

  describe('XML Parser - parseFindStandardDosageResponse', () => {
    it('should parse successful response with multiple dosages', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.searchDate).toBe('2026-01-13');
    });

    it('should parse adult dosage correctly', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const adultDosage = result.data?.find((d) => d.TargetGroup === 'ADULT');

      expect(adultDosage).toBeDefined();
      expect(adultDosage?.['@_Code']).toBe(12);
      expect(adultDosage?.KidneyFailureClass).toBe(2);
      expect(adultDosage?.LiverFailureClass).toBe(1);
      expect(adultDosage?.TreatmentDurationType).toBe('IF_NECESSARY');
      expect(adultDosage?.Quantity).toBe(1);
      expect(adultDosage?.AdministrationFrequencyQuantity).toBe(1);
    });

    it('should parse adolescent dosage with parameter bounds', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const adolescentDosage = result.data?.find((d) => d.TargetGroup === 'ADOLESCENT');

      expect(adolescentDosage).toBeDefined();
      expect(adolescentDosage?.ParameterBounds).toBeDefined();
      expect(adolescentDosage?.ParameterBounds).toHaveLength(1);

      const weightBounds = adolescentDosage?.ParameterBounds?.[0];
      expect(weightBounds?.DosageParameter?.['@_code']).toBe('weight');
      expect(weightBounds?.LowerBound?.['#text']).toBe(34);
      expect(weightBounds?.LowerBound?.['@_Unit']).toBe('kg');
      expect(weightBounds?.UpperBound?.['#text']).toBe(50);
      expect(weightBounds?.UpperBound?.['@_Unit']).toBe('kg');
    });

    it('should parse pediatric dosage with temporary duration', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const pediatricDosage = result.data?.find((d) => d.TargetGroup === 'PAEDIATRICS');

      expect(pediatricDosage).toBeDefined();
      expect(pediatricDosage?.TreatmentDurationType).toBe('TEMPORARY');
      expect(pediatricDosage?.TemporalityDuration?.['#text']).toBe(5);
      expect(pediatricDosage?.TemporalityDuration?.['@_Unit']).toBe('d');
      expect(pediatricDosage?.AdministrationFrequencyQuantity).toBe(3);
    });

    it('should parse indication correctly', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const adultDosage = result.data?.find((d) => d.TargetGroup === 'ADULT');

      expect(adultDosage?.Indication).toBeDefined();
      expect(adultDosage?.Indication?.['@_code']).toBe(149);
    });

    it('should parse route of administration', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const adultDosage = result.data?.find((d) => d.TargetGroup === 'ADULT');

      expect(adultDosage?.RouteOfAdministration).toBeDefined();
      expect(adultDosage?.RouteOfAdministration).toHaveLength(1);
      expect(adultDosage?.RouteOfAdministration?.[0]['@_Code']).toBe(57);
    });

    it('should parse additional fields', () => {
      const xml = loadFixture('findstandarddosage-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      const adultDosage = result.data?.find((d) => d.TargetGroup === 'ADULT');

      expect(adultDosage?.AdditionalFields).toBeDefined();
      expect(adultDosage?.AdditionalFields?.length).toBeGreaterThan(0);

      const posologyNl = adultDosage?.AdditionalFields?.find((f) => f.Key === 'posology_nl');
      expect(posologyNl?.Value).toBe('Maximum 6 keer per dag');
    });

    it('should handle no results response as empty array', () => {
      const xml = loadFixture('findstandarddosage-noresults-response.xml');
      const result = parseFindStandardDosageResponse(xml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle invalid XML gracefully', () => {
      const result = parseFindStandardDosageResponse('invalid xml');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });
});
