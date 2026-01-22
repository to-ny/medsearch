/**
 * CNK (Centraal Nummer Kengetal) utilities
 * CNK codes are 7-digit Belgian pharmacy barcodes that uniquely identify medication packages
 */

/** Regular expression to match exactly 7 digits (valid CNK code format) */
export const CNK_PATTERN = /^\d{7}$/;

/** Maximum number of CNK codes allowed in batch lookup */
export const CNK_BATCH_LIMIT = 100;

/** Validation message with translation key and parameters */
export interface ValidationMessage {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * Checks if a string is a valid CNK code format (exactly 7 digits)
 */
export function isCNKCode(value: string): boolean {
  return CNK_PATTERN.test(value.trim());
}

/**
 * Detects if the input appears to be a CNK code search
 * Returns true for exactly 7 digits
 */
export function detectCNKInput(value: string): boolean {
  return isCNKCode(value.trim());
}

/**
 * Normalizes a CNK code by removing whitespace and validating format
 * Returns the normalized code or null if invalid
 */
export function normalizeCNKCode(value: string): string | null {
  const trimmed = value.trim();
  return isCNKCode(trimmed) ? trimmed : null;
}

/**
 * Parses batch input containing multiple CNK codes
 * Supports comma, space, newline, tab, and semicolon separators
 * Returns an object with valid codes, invalid entries, and duplicate codes
 */
export function parseBatchCNKInput(input: string): {
  validCodes: string[];
  invalidEntries: string[];
  duplicates: string[];
} {
  // Split by common separators (comma, newline, tab, semicolon, multiple spaces)
  const entries = input
    .split(/[,;\n\t]+|\s{2,}/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  // Also handle single-space-separated entries
  const expandedEntries: string[] = [];
  for (const entry of entries) {
    // If entry contains single spaces, it might be space-separated codes
    if (entry.includes(' ')) {
      const parts = entry.split(/\s+/).filter((p) => p.length > 0);
      expandedEntries.push(...parts);
    } else {
      expandedEntries.push(entry);
    }
  }

  const validCodes: string[] = [];
  const invalidEntries: string[] = [];
  const seenCodes = new Set<string>();
  const duplicates: string[] = [];

  for (const entry of expandedEntries) {
    const normalized = normalizeCNKCode(entry);
    if (normalized) {
      if (seenCodes.has(normalized)) {
        duplicates.push(normalized);
      } else {
        seenCodes.add(normalized);
        validCodes.push(normalized);
      }
    } else if (entry.length > 0) {
      invalidEntries.push(entry);
    }
  }

  return { validCodes, invalidEntries, duplicates };
}

/**
 * Validates batch input and returns validation result with translation keys
 */
export function validateBatchInput(input: string): {
  isValid: boolean;
  codes: string[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
} {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];

  if (!input.trim()) {
    return {
      isValid: false,
      codes: [],
      errors: [{ key: 'pharmacist.validation.enterAtLeastOne' }],
      warnings: [],
    };
  }

  const { validCodes, invalidEntries, duplicates } = parseBatchCNKInput(input);

  // Check for invalid entries
  if (invalidEntries.length > 0) {
    const displayEntries = invalidEntries.slice(0, 5);
    const remaining = invalidEntries.length - 5;
    errors.push({
      key: 'pharmacist.validation.invalidEntries',
      params: {
        entries: displayEntries.map((e) => `"${e}"`).join(', '),
        remaining,
      },
    });
  }

  // Check for duplicates
  if (duplicates.length > 0) {
    const displayDuplicates = duplicates.slice(0, 5);
    const remaining = duplicates.length - 5;
    warnings.push({
      key: 'pharmacist.validation.duplicatesRemoved',
      params: {
        codes: displayDuplicates.join(', '),
        remaining,
      },
    });
  }

  // Check batch limit
  if (validCodes.length > CNK_BATCH_LIMIT) {
    errors.push({
      key: 'pharmacist.validation.maxCodesExceeded',
      params: {
        limit: CNK_BATCH_LIMIT,
        count: validCodes.length,
      },
    });
  }

  // Check if no valid codes found
  if (validCodes.length === 0 && invalidEntries.length > 0) {
    errors.push({ key: 'pharmacist.validation.noValidCodes' });
  }

  return {
    isValid: errors.length === 0 && validCodes.length > 0,
    codes: validCodes.slice(0, CNK_BATCH_LIMIT),
    errors,
    warnings,
  };
}

/**
 * Formats CNK code for display with proper grouping
 * Example: 4757811 -> "475 7811" (optional visual formatting)
 */
export function formatCNKCode(code: string): string {
  // CNK codes are typically displayed as-is without grouping
  return code;
}

/**
 * Generates example CNK codes for demo purposes
 */
export function getExampleCNKCodes(): string[] {
  return ['4757811', '1234567', '9876543'];
}
