import { describe, it, expect } from 'vitest';
import {
  buildFindAmpRequest,
  buildFindVmpRequest,
  buildFindReimbursementRequest,
  buildFindCompanyRequest,
} from '@/lib/soap/xml-builder';

describe('XML Builder', () => {
  describe('buildFindAmpRequest', () => {
    it('should build request with name search', () => {
      const xml = buildFindAmpRequest({ anyNamePart: 'paracetamol' });

      expect(xml).toContain('FindAmpRequest');
      expect(xml).toContain('<FindByProduct>');
      expect(xml).toContain('<AnyNamePart>paracetamol</AnyNamePart>');
      expect(xml).toContain('IssueInstant=');
    });

    it('should build request with CNK code', () => {
      const xml = buildFindAmpRequest({ cnk: '1234567' });

      expect(xml).toContain('<FindByDmpp>');
      expect(xml).toContain('<Code>1234567</Code>');
      expect(xml).toContain('<CodeType>CNK</CodeType>');
    });

    it('should include IssueInstant attribute', () => {
      const xml = buildFindAmpRequest({ anyNamePart: 'test' });

      // IssueInstant is required by SAM v2 API
      expect(xml).toMatch(/IssueInstant="[^"]+"/);
    });

    it('should build request with search date', () => {
      const xml = buildFindAmpRequest({ anyNamePart: 'test', searchDate: '2024-01-15' });

      expect(xml).toContain('SearchDate="2024-01-15"');
    });

    it('should escape special XML characters', () => {
      const xml = buildFindAmpRequest({ anyNamePart: 'test<>&"' });

      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });

    describe('company filter combinations', () => {
      it('should combine name search with company filter', () => {
        const xml = buildFindAmpRequest({ anyNamePart: 'dafalgan', companyActorNr: '01995' });

        expect(xml).toContain('<FindByProduct>');
        expect(xml).toContain('<AnyNamePart>dafalgan</AnyNamePart>');
        expect(xml).toContain('<FindByCompany>');
        expect(xml).toContain('<CompanyActorNr>01995</CompanyActorNr>');
        // FindByCompany should come after FindByProduct
        expect(xml.indexOf('FindByProduct')).toBeLessThan(xml.indexOf('FindByCompany'));
      });

      it('should combine CNK search with company filter', () => {
        const xml = buildFindAmpRequest({ cnk: '2538657', companyActorNr: '01995' });

        expect(xml).toContain('<FindByDmpp>');
        expect(xml).toContain('<Code>2538657</Code>');
        expect(xml).toContain('<FindByCompany>');
        expect(xml).toContain('<CompanyActorNr>01995</CompanyActorNr>');
      });

      it('should combine AmpCode search with company filter', () => {
        const xml = buildFindAmpRequest({ ampCode: 'SAM478337-00', companyActorNr: '01995' });

        expect(xml).toContain('<FindByProduct>');
        expect(xml).toContain('<AmpCode>SAM478337-00</AmpCode>');
        expect(xml).toContain('<FindByCompany>');
        expect(xml).toContain('<CompanyActorNr>01995</CompanyActorNr>');
      });

      it('should NOT combine ingredient search with company filter', () => {
        const xml = buildFindAmpRequest({ ingredient: 'paracetamol', companyActorNr: '01995' });

        expect(xml).toContain('<FindByIngredient>');
        expect(xml).toContain('<SubstanceName>paracetamol</SubstanceName>');
        // Company filter should be ignored
        expect(xml).not.toContain('<FindByCompany>');
        expect(xml).not.toContain('<CompanyActorNr>');
      });

      it('should NOT combine vmpCode search with company filter', () => {
        const xml = buildFindAmpRequest({ vmpCode: '25747', companyActorNr: '01995' });

        expect(xml).toContain('<FindByVirtualProduct>');
        expect(xml).toContain('<VmpCode>25747</VmpCode>');
        // Company filter should be ignored
        expect(xml).not.toContain('<FindByCompany>');
        expect(xml).not.toContain('<CompanyActorNr>');
      });

      it('should support company-only search', () => {
        const xml = buildFindAmpRequest({ companyActorNr: '01995' });

        expect(xml).toContain('<FindByCompany>');
        expect(xml).toContain('<CompanyActorNr>01995</CompanyActorNr>');
        expect(xml).not.toContain('<FindByProduct>');
        expect(xml).not.toContain('<FindByDmpp>');
      });
    });
  });

  describe('buildFindVmpRequest', () => {
    it('should build request with name search', () => {
      const xml = buildFindVmpRequest({ anyNamePart: 'paracetamol' });

      expect(xml).toContain('FindVmpRequest');
      expect(xml).toContain('<FindByProduct>');
      expect(xml).toContain('<AnyNamePart>paracetamol</AnyNamePart>');
    });

    it('should build request with VMP code', () => {
      const xml = buildFindVmpRequest({ vmpCode: '12345' });

      expect(xml).toContain('<VmpCode>12345</VmpCode>');
    });
  });

  describe('buildFindReimbursementRequest', () => {
    it('should build request with CNK code', () => {
      const xml = buildFindReimbursementRequest({ cnk: '1234567' });

      expect(xml).toContain('FindReimbursementRequest');
      expect(xml).toContain('<Code>1234567</Code>');
    });

    it('should build request with AMPP code', () => {
      const xml = buildFindReimbursementRequest({ amppCode: '123456' });

      expect(xml).toContain('<FindByPackage>');
      expect(xml).toContain('<CtiExtendedCode>123456</CtiExtendedCode>');
    });
  });

  describe('buildFindCompanyRequest', () => {
    it('should build request with name search', () => {
      const xml = buildFindCompanyRequest({ anyNamePart: 'pfizer' });

      expect(xml).toContain('FindCompanyRequest');
      expect(xml).toContain('<AnyNamePart>pfizer</AnyNamePart>');
    });

    it('should build request with actor number', () => {
      const xml = buildFindCompanyRequest({ companyActorNr: '12345' });

      expect(xml).toContain('<CompanyActorNr>12345</CompanyActorNr>');
    });
  });
});
