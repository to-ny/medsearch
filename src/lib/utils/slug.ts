import type { MultilingualText, Language } from '@/server/types/domain';

/**
 * Generate URL-safe slug from text
 * - Lowercase
 * - Replace spaces/special chars with hyphens
 * - Remove accents for URL safety (paracétamol → paracetamol)
 * - Collapse multiple hyphens
 * - Trim leading/trailing hyphens
 */
export function slugify(text: string): string {
  return text
    // Normalize unicode and remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Generate slug for an entity in a specific language
 * - Uses localized name if available for that exact language
 * - Falls back to ID only if language not available (NO fallback to other languages)
 * - Always appends ID for uniqueness
 * - Uses underscore as delimiter since codes can contain hyphens (e.g., SAM375453-00)
 */
export function generateEntitySlug(
  name: MultilingualText | null | undefined,
  id: string,
  lang: Language
): string {
  if (!name) return id;

  const localizedName = name[lang]; // Exact language only, no fallback

  if (localizedName) {
    const slugifiedName = slugify(localizedName);
    // If slugified name is empty (e.g., only special chars), return just ID
    // Use underscore as delimiter since codes can contain hyphens
    return slugifiedName ? `${slugifiedName}_${id}` : id;
  }

  // Language not available - return ID only
  return id;
}

/**
 * Extract ID from slug
 * - For "paracetamol-500mg_SAM375453-00" → "SAM375453-00"
 * - For "SAM375453-00" → "SAM375453-00"
 * - ID is everything after the last underscore (if present)
 * - Uses underscore as delimiter since codes can contain hyphens
 */
export function extractIdFromSlug(slug: string): string {
  const underscoreIndex = slug.lastIndexOf('_');
  if (underscoreIndex !== -1) {
    return slug.substring(underscoreIndex + 1);
  }
  // No underscore found - slug is just the ID
  return slug;
}

/**
 * Generate slug for a company
 * Companies are not multilingual, just use denomination
 * Uses underscore as delimiter for consistency with other slugs
 */
export function generateCompanySlug(denomination: string, actorNr: string): string {
  const slugifiedName = slugify(denomination);
  return slugifiedName ? `${slugifiedName}_${actorNr}` : actorNr;
}

/**
 * Generate slug for ATC code
 * Format: {code}_{localized-description} or just {code}
 * Uses underscore as delimiter for consistency with other slugs
 */
export function generateATCSlug(
  code: string,
  description: MultilingualText | null | undefined,
  lang: Language
): string {
  if (!description) return code;

  const localizedDescription = description[lang];

  if (localizedDescription) {
    const slugifiedDescription = slugify(localizedDescription);
    return slugifiedDescription ? `${code}_${slugifiedDescription}` : code;
  }

  return code;
}

/**
 * Extract ATC code from slug
 * For "N02BE01_paracetamol" → "N02BE01"
 * For "N02BE01" → "N02BE01"
 * ATC code is always before the underscore (or the whole slug if no underscore)
 */
export function extractATCCodeFromSlug(slug: string): string {
  const underscoreIndex = slug.indexOf('_');
  if (underscoreIndex !== -1) {
    return slug.substring(0, underscoreIndex).toUpperCase();
  }
  // No underscore found - slug is just the code
  return slug.toUpperCase();
}
