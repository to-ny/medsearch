/**
 * Formatting utilities for prices, dates, and other display values
 */

/**
 * Format a price in Euro currency
 */
export function formatPrice(
  amount: number | null | undefined,
  options?: {
    showNull?: boolean;
    nullText?: string;
  }
): string {
  if (amount === null || amount === undefined) {
    if (options?.showNull) {
      return options.nullText || 'Price not available';
    }
    return '';
  }

  return new Intl.NumberFormat('de-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string for display
 */
export function formatDate(
  date: string | null | undefined,
  options?: {
    format?: 'short' | 'medium' | 'long';
    locale?: string;
  }
): string {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const formatOptionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
  };
  const formatOptions = formatOptionsMap[options?.format || 'medium'];

  return new Intl.DateTimeFormat(options?.locale || 'en-GB', formatOptions).format(dateObj);
}

/**
 * Format validity period
 */
export function formatValidityPeriod(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} - ${end}`;
  }
  if (start) {
    return `From ${start}`;
  }
  if (end) {
    return `Until ${end}`;
  }
  return '';
}

/**
 * Format a CNK code for display (7 digits)
 */
export function formatCNK(code: string | null | undefined): string {
  if (!code) return '';
  return code.padStart(7, '0');
}

/**
 * Format a dosage quantity
 */
export function formatQuantity(
  quantity: number | null | undefined,
  denominator?: number | null
): string {
  if (quantity === null || quantity === undefined) return '';

  if (denominator && denominator !== 1) {
    return `${quantity}/${denominator}`;
  }
  return quantity.toString();
}

/**
 * Format a quantity range
 */
export function formatQuantityRange(
  lower: number | null | undefined,
  upper: number | null | undefined
): string {
  if (lower !== null && lower !== undefined && upper !== null && upper !== undefined) {
    return `${lower}-${upper}`;
  }
  if (lower !== null && lower !== undefined) {
    return `≥${lower}`;
  }
  if (upper !== null && upper !== undefined) {
    return `≤${upper}`;
  }
  return '';
}

/**
 * Format an agreement term
 */
export function formatAgreementTerm(
  quantity: number | null | undefined,
  unit: 'D' | 'W' | 'M' | 'Y' | null | undefined
): string {
  if (quantity === null || quantity === undefined || !unit) return '';

  const unitLabels: Record<string, string> = {
    D: quantity === 1 ? 'day' : 'days',
    W: quantity === 1 ? 'week' : 'weeks',
    M: quantity === 1 ? 'month' : 'months',
    Y: quantity === 1 ? 'year' : 'years',
  };

  return `${quantity} ${unitLabels[unit] || unit}`;
}

/**
 * Format a phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Basic formatting - could be enhanced with a library like libphonenumber
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Format a full address
 */
export function formatAddress(
  streetName: string | null | undefined,
  streetNum: string | null | undefined,
  postbox: string | null | undefined,
  postcode: string | null | undefined,
  city: string | null | undefined,
  countryCode: string | null | undefined,
  locale?: string
): string[] {
  const lines: string[] = [];

  // Street line
  const streetParts = [streetName, streetNum].filter(Boolean);
  if (streetParts.length > 0) {
    let streetLine = streetParts.join(' ');
    if (postbox) {
      streetLine += `, Box ${postbox}`;
    }
    lines.push(streetLine);
  }

  // City line
  const cityParts = [postcode, city].filter(Boolean);
  if (cityParts.length > 0) {
    lines.push(cityParts.join(' '));
  }

  // Country - use localized name if locale is provided
  if (countryCode) {
    const countryName = locale ? formatCountryName(countryCode, locale) : countryCode;
    lines.push(countryName);
  }

  return lines;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format a country code to its full localized name
 * Uses the Intl.DisplayNames API to get the country name in the specified locale
 */
export function formatCountryName(
  countryCode: string | null | undefined,
  locale: string = 'en'
): string {
  if (!countryCode) return '';

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(countryCode.toUpperCase()) || countryCode;
  } catch {
    // Fallback to raw code if Intl.DisplayNames is not supported or fails
    return countryCode;
  }
}
