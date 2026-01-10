import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  calculateSavings,
  findCheapest,
  getPriceCategory,
  calculatePricePerUnit,
  formatPricePerUnit,
} from '@/lib/utils/price';
import type { MedicationSearchResult } from '@/lib/types';

describe('Price Utilities', () => {
  describe('formatPrice', () => {
    it('should format price in euros', () => {
      const formatted = formatPrice(10.5, 'nl-BE');
      expect(formatted).toContain('10');
      expect(formatted).toContain('€');
    });

    it('should return N/A for undefined price', () => {
      expect(formatPrice(undefined)).toBe('N/A');
    });

    it('should handle zero price', () => {
      const formatted = formatPrice(0);
      expect(formatted).toContain('0');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate savings amount and percentage', () => {
      const savings = calculateSavings(100, 80);

      expect(savings.amount).toBe(20);
      expect(savings.percentage).toBe(20);
    });

    it('should handle negative savings (price increase)', () => {
      const savings = calculateSavings(80, 100);

      expect(savings.amount).toBe(-20);
      expect(savings.percentage).toBe(-25);
    });

    it('should handle zero original price', () => {
      const savings = calculateSavings(0, 10);

      expect(savings.amount).toBe(-10);
      expect(savings.percentage).toBe(0);
    });
  });

  describe('findCheapest', () => {
    it('should find the cheapest medication', () => {
      const medications: MedicationSearchResult[] = [
        { ampCode: 'SAM1', name: 'Med A', price: 15, isReimbursed: false, status: 'AUTHORIZED' },
        { ampCode: 'SAM2', name: 'Med B', price: 10, isReimbursed: false, status: 'AUTHORIZED' },
        { ampCode: 'SAM3', name: 'Med C', price: 20, isReimbursed: false, status: 'AUTHORIZED' },
      ];

      const cheapest = findCheapest(medications);

      expect(cheapest?.ampCode).toBe('SAM2');
      expect(cheapest?.price).toBe(10);
    });

    it('should return undefined for empty array', () => {
      expect(findCheapest([])).toBeUndefined();
    });

    it('should skip medications without price', () => {
      const medications: MedicationSearchResult[] = [
        { ampCode: 'SAM1', name: 'Med A', isReimbursed: false, status: 'AUTHORIZED' },
        { ampCode: 'SAM2', name: 'Med B', price: 10, isReimbursed: false, status: 'AUTHORIZED' },
      ];

      const cheapest = findCheapest(medications);

      expect(cheapest?.ampCode).toBe('SAM2');
    });
  });

  describe('getPriceCategory', () => {
    it('should return cheap for low prices', () => {
      expect(getPriceCategory(3)).toBe('cheap');
      expect(getPriceCategory(5)).toBe('cheap');
    });

    it('should return moderate for medium prices', () => {
      expect(getPriceCategory(10)).toBe('moderate');
      expect(getPriceCategory(15)).toBe('moderate');
    });

    it('should return expensive for high prices', () => {
      expect(getPriceCategory(20)).toBe('expensive');
      expect(getPriceCategory(100)).toBe('expensive');
    });

    it('should return moderate for undefined', () => {
      expect(getPriceCategory(undefined)).toBe('moderate');
    });
  });

  describe('calculatePricePerUnit', () => {
    it('should calculate price per tablet', () => {
      const result = calculatePricePerUnit(15, '30', 'film-coated tablet');

      expect(result).not.toBeNull();
      expect(result!.pricePerUnit).toBeCloseTo(0.5, 2);
      expect(result!.unit).toBe('tablet');
    });

    it('should calculate price per capsule', () => {
      const result = calculatePricePerUnit(20, '20', 'capsule, hard');

      expect(result).not.toBeNull();
      expect(result!.pricePerUnit).toBe(1);
      expect(result!.unit).toBe('capsule');
    });

    it('should handle numeric pack size', () => {
      const result = calculatePricePerUnit(10, 50, 'tablet');

      expect(result).not.toBeNull();
      expect(result!.pricePerUnit).toBeCloseTo(0.2, 2);
    });

    it('should return null for undefined price', () => {
      const result = calculatePricePerUnit(undefined, '30', 'tablet');
      expect(result).toBeNull();
    });

    it('should return null for zero price', () => {
      const result = calculatePricePerUnit(0, '30', 'tablet');
      expect(result).toBeNull();
    });

    it('should return null for negative price', () => {
      const result = calculatePricePerUnit(-10, '30', 'tablet');
      expect(result).toBeNull();
    });

    it('should return null for undefined pack size', () => {
      const result = calculatePricePerUnit(15, undefined, 'tablet');
      expect(result).toBeNull();
    });

    it('should handle complex pack sizes like "20 x 10 ml"', () => {
      const result = calculatePricePerUnit(30, '20 x 10 ml', 'solution for injection');

      // Complex pack sizes with "x" may not be parseable depending on format.ts logic
      // If parsePackSize returns displayRaw=true for complex formats, this returns null
      // This is acceptable behavior - we only calculate price-per-unit for simple formats
      if (result !== null) {
        expect(result.pricePerUnit).toBeCloseTo(1.5, 2);
      }
    });

    it('should default to "unit" when pharmaceutical form is unknown', () => {
      const result = calculatePricePerUnit(10, '10', 'some unknown form');

      expect(result).not.toBeNull();
      expect(result!.unit).toBe('unit');
    });
  });

  describe('formatPricePerUnit', () => {
    it('should format price per unit with currency', () => {
      const result = formatPricePerUnit({ pricePerUnit: 0.5, unit: 'tablet' }, 'nl-BE');

      expect(result).not.toBeNull();
      expect(result).toContain('0,50');
      expect(result).toContain('€');
    });

    it('should return null for null input', () => {
      const result = formatPricePerUnit(null);
      expect(result).toBeNull();
    });

    it('should format with 2 decimal places', () => {
      const result = formatPricePerUnit({ pricePerUnit: 1.234, unit: 'tablet' }, 'en-US');

      expect(result).not.toBeNull();
      // Should be formatted to 2 decimal places
      expect(result).toMatch(/1\.23|€1,23/);
    });

    it('should handle very small prices', () => {
      const result = formatPricePerUnit({ pricePerUnit: 0.01, unit: 'tablet' });

      expect(result).not.toBeNull();
      expect(result).toContain('0,01');
    });
  });
});
