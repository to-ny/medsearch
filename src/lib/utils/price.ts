/**
 * Price utilities for medication pricing and comparison
 */

import type { Medication, MedicationSearchResult, Reimbursement, PriceComparisonItem } from '@/lib/types';
import { parsePackSize } from '@/lib/utils/format';

/**
 * Calculates patient out-of-pocket cost based on price and reimbursement
 *
 * This is a pure calculation function that can be used on both server and client.
 */
export function calculatePatientCost(
  price: number | undefined,
  reimbursement: Reimbursement | undefined,
  regimen: string = 'AMBULATORY'
): number | undefined {
  if (price === undefined) return undefined;
  if (!reimbursement) return price; // No reimbursement = patient pays full price

  const copayment = reimbursement.copayments.find(
    (c) => c.regimen === regimen || c.regimen === 'AMBULATORY'
  );

  if (copayment?.feeAmount !== undefined) {
    return copayment.feeAmount;
  }

  if (copayment?.reimbursementAmount !== undefined) {
    return Math.max(0, price - copayment.reimbursementAmount);
  }

  return price;
}

/**
 * Gets reimbursement category description
 *
 * This is a pure function that maps category codes to descriptions.
 */
export function getReimbursementCategoryDescription(category: string | undefined): string {
  if (!category) return 'Unknown';

  const categories: Record<string, string> = {
    A: 'Category A - Essential medications',
    B: 'Category B - Useful medications',
    C: 'Category C - Comfort medications',
    Cs: 'Category Cs - Comfort (special)',
    Cx: 'Category Cx - Exception category',
    D: 'Category D - Not reimbursed',
  };

  return categories[category] || `Category ${category}`;
}

/**
 * Formats a price in euros
 */
export function formatPrice(price: number | undefined, locale = 'nl-BE'): string {
  if (price === undefined) return 'N/A';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/**
 * Result of price-per-unit calculation
 */
export interface PricePerUnitResult {
  /** The price per single unit */
  pricePerUnit: number;
  /** The unit key for translation (e.g., 'tablet', 'ml', 'dose') */
  unit: string;
}

/**
 * Calculates price per unit for a medication package
 *
 * @param price - The total package price
 * @param packSize - The pack display value (e.g., "30", "20 x 10 ml")
 * @param pharmaceuticalForm - The pharmaceutical form name (e.g., "film-coated tablet")
 * @returns Price per unit with unit type, or null if cannot be calculated
 */
export function calculatePricePerUnit(
  price: number | undefined,
  packSize: string | number | undefined,
  pharmaceuticalForm?: string
): PricePerUnitResult | null {
  // Handle edge cases: zero, undefined, or negative prices
  if (price === undefined || price <= 0) {
    return null;
  }

  // Parse the pack size to get count and unit
  const packInfo = parsePackSize(packSize, pharmaceuticalForm);

  // If we can't determine the count or it's zero, we can't calculate price per unit
  if (packInfo.displayRaw || !packInfo.count || packInfo.count <= 0) {
    return null;
  }

  // Calculate price per unit
  const pricePerUnit = price / packInfo.count;

  return {
    pricePerUnit,
    unit: packInfo.unitKey || 'unit',
  };
}

/**
 * Formats a price-per-unit result for display
 *
 * @param result - The price-per-unit calculation result
 * @param locale - The locale for number formatting
 * @returns Formatted string like "0.45" (without currency symbol, for use with translations)
 */
export function formatPricePerUnit(
  result: PricePerUnitResult | null,
  locale = 'nl-BE'
): string | null {
  if (!result) return null;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(result.pricePerUnit);
}

/**
 * Calculates savings between two prices
 */
export function calculateSavings(originalPrice: number, newPrice: number): {
  amount: number;
  percentage: number;
} {
  const amount = originalPrice - newPrice;
  const percentage = originalPrice > 0 ? (amount / originalPrice) * 100 : 0;

  return { amount, percentage };
}

/**
 * Finds the cheapest option in a list of medications
 */
export function findCheapest(medications: MedicationSearchResult[]): MedicationSearchResult | undefined {
  return medications.reduce<MedicationSearchResult | undefined>((cheapest, current) => {
    if (current.price === undefined) return cheapest;
    if (!cheapest || cheapest.price === undefined) return current;
    return current.price < cheapest.price ? current : cheapest;
  }, undefined);
}

/**
 * Creates price comparison items from medications and their reimbursement data
 */
export function createPriceComparison(
  medications: MedicationSearchResult[],
  reimbursements: Map<string, Reimbursement | undefined>,
  referenceAmpCode?: string
): PriceComparisonItem[] {
  const items = medications.map((med) => {
    const reimbursement = med.cnk ? reimbursements.get(med.cnk) : undefined;
    const patientCost = med.price !== undefined
      ? calculatePatientCost(med.price, reimbursement)
      : undefined;

    return {
      name: med.name,
      cnk: med.cnk || '',
      price: med.price,
      patientCost,
      insuranceAmount: med.price !== undefined && patientCost !== undefined
        ? med.price - patientCost
        : undefined,
      isReference: med.ampCode === referenceAmpCode,
      isCheapest: false,
      companyName: med.companyName,
    };
  });

  // Mark cheapest
  const cheapestPrice = Math.min(
    ...items.filter((i) => i.patientCost !== undefined).map((i) => i.patientCost!)
  );

  for (const item of items) {
    if (item.patientCost === cheapestPrice) {
      item.isCheapest = true;
    }
  }

  return items.sort((a, b) => (a.patientCost || Infinity) - (b.patientCost || Infinity));
}

/**
 * Gets price category based on patient cost
 */
export type PriceCategory = 'cheap' | 'moderate' | 'expensive';

export function getPriceCategory(patientCost: number | undefined): PriceCategory {
  if (patientCost === undefined) return 'moderate';
  if (patientCost <= 5) return 'cheap';
  if (patientCost <= 15) return 'moderate';
  return 'expensive';
}

/**
 * Gets all CNK codes with their prices from a medication
 */
export function getCnkPrices(medication: Medication): Array<{ cnk: string; price?: number; deliveryEnv: 'P' | 'H' }> {
  return medication.packages.flatMap((pkg) =>
    pkg.cnkCodes.map((cnk) => ({
      cnk: cnk.code,
      price: cnk.price,
      deliveryEnv: cnk.deliveryEnvironment,
    }))
  );
}

/**
 * Gets the primary (public pharmacy) price for a medication
 */
export function getPrimaryPrice(medication: Medication): number | undefined {
  for (const pkg of medication.packages) {
    const publicCnk = pkg.cnkCodes.find((c) => c.deliveryEnvironment === 'P');
    if (publicCnk?.price !== undefined) {
      return publicCnk.price;
    }
  }
  return undefined;
}
