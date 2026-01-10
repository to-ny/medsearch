import { describe, it, expect } from 'vitest';
import {
  isChapterIVCriterion,
  isChapterIV,
  hasChapterIVReimbursement,
  getChapterIVInfoUrl,
  CHAPTER_IV_INFO_URLS,
} from '@/lib/utils/chapterIV';
import type { Reimbursement } from '@/lib/types';

describe('Chapter IV Utilities', () => {
  describe('isChapterIVCriterion', () => {
    it('should return true for criterion codes ending with "f"', () => {
      expect(isChapterIVCriterion('Af')).toBe(true);
      expect(isChapterIVCriterion('Bf')).toBe(true);
      expect(isChapterIVCriterion('Cf')).toBe(true);
      expect(isChapterIVCriterion('Df')).toBe(true);
    });

    it('should return true for lowercase "f" suffix', () => {
      expect(isChapterIVCriterion('af')).toBe(true);
      expect(isChapterIVCriterion('AF')).toBe(true);
      expect(isChapterIVCriterion('aF')).toBe(true);
    });

    it('should return false for criterion codes not ending with "f"', () => {
      expect(isChapterIVCriterion('A')).toBe(false);
      expect(isChapterIVCriterion('B')).toBe(false);
      expect(isChapterIVCriterion('C')).toBe(false);
      expect(isChapterIVCriterion('D')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isChapterIVCriterion(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isChapterIVCriterion('')).toBe(false);
    });

    it('should return false for codes where f is not at the end', () => {
      expect(isChapterIVCriterion('fA')).toBe(false);
      expect(isChapterIVCriterion('AfB')).toBe(false);
    });
  });

  describe('isChapterIV', () => {
    it('should return true for reimbursement with Chapter IV criterion', () => {
      const reimbursement: Reimbursement = {
        criterion: { code: 'Af', description: 'Test criterion' },
        category: 'A',
      };

      expect(isChapterIV(reimbursement)).toBe(true);
    });

    it('should return false for reimbursement without Chapter IV criterion', () => {
      const reimbursement: Reimbursement = {
        criterion: { code: 'A', description: 'Test criterion' },
        category: 'A',
      };

      expect(isChapterIV(reimbursement)).toBe(false);
    });

    it('should return false for reimbursement without criterion', () => {
      const reimbursement: Reimbursement = {
        category: 'A',
      };

      expect(isChapterIV(reimbursement)).toBe(false);
    });

    it('should return false for undefined reimbursement', () => {
      expect(isChapterIV(undefined)).toBe(false);
    });

    it('should return false for null reimbursement', () => {
      expect(isChapterIV(null)).toBe(false);
    });
  });

  describe('hasChapterIVReimbursement', () => {
    it('should return true if any reimbursement is Chapter IV', () => {
      const reimbursements: Reimbursement[] = [
        { criterion: { code: 'A', description: 'Regular' }, category: 'A' },
        { criterion: { code: 'Bf', description: 'Chapter IV' }, category: 'B' },
      ];

      expect(hasChapterIVReimbursement(reimbursements)).toBe(true);
    });

    it('should return false if no reimbursements are Chapter IV', () => {
      const reimbursements: Reimbursement[] = [
        { criterion: { code: 'A', description: 'Regular' }, category: 'A' },
        { criterion: { code: 'B', description: 'Also regular' }, category: 'B' },
      ];

      expect(hasChapterIVReimbursement(reimbursements)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasChapterIVReimbursement([])).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasChapterIVReimbursement(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasChapterIVReimbursement(null)).toBe(false);
    });
  });

  describe('getChapterIVInfoUrl', () => {
    it('should return Dutch RIZIV URL for "nl"', () => {
      const url = getChapterIVInfoUrl('nl');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.nl);
      expect(url).toContain('riziv.fgov.be/nl');
    });

    it('should return French INAMI URL for "fr"', () => {
      const url = getChapterIVInfoUrl('fr');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.fr);
      expect(url).toContain('inami.fgov.be/fr');
    });

    it('should return German fallback URL for "de"', () => {
      const url = getChapterIVInfoUrl('de');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.de);
    });

    it('should return English fallback URL for "en"', () => {
      const url = getChapterIVInfoUrl('en');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.en);
    });

    it('should handle uppercase language codes', () => {
      const url = getChapterIVInfoUrl('NL');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.nl);
    });

    it('should return English fallback for unknown language', () => {
      const url = getChapterIVInfoUrl('es');
      expect(url).toBe(CHAPTER_IV_INFO_URLS.en);
    });
  });
});
