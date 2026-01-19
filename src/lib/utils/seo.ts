import type { Language, MultilingualText } from '@/server/types/domain';
import { LANGUAGES } from '@/server/types/domain';
import { generateEntitySlug, generateCompanySlug, generateATCSlug } from './slug';

const BASE_URL = 'https://medsearch.be';

/**
 * Generate alternates for metadata (canonical + hreflang)
 * NL is always canonical
 */
export function generateAlternates(
  pathGenerator: (lang: Language) => string
) {
  const nlPath = pathGenerator('nl');

  return {
    canonical: `${BASE_URL}${nlPath}`,
    languages: Object.fromEntries(
      LANGUAGES.map(lang => [lang, `${BASE_URL}${pathGenerator(lang)}`])
    ) as Record<Language, string>,
  };
}

/**
 * Generate alternates for an entity with multilingual name
 */
export function generateEntityAlternates(
  entityType: 'substances' | 'ingredients' | 'generics' | 'medications' | 'packages' | 'therapeutic-groups',
  name: MultilingualText | null | undefined,
  id: string
) {
  return generateAlternates((lang) => {
    const slug = generateEntitySlug(name, id, lang);
    return `/${lang}/${entityType}/${slug}`;
  });
}

/**
 * Generate alternates for company pages
 */
export function generateCompanyAlternates(
  denomination: string,
  actorNr: string
) {
  const slug = generateCompanySlug(denomination, actorNr);
  return generateAlternates((lang) => `/${lang}/companies/${slug}`);
}

/**
 * Generate alternates for ATC pages
 */
export function generateATCAlternates(
  code: string,
  description: MultilingualText | null | undefined
) {
  return generateAlternates((lang) => {
    const slug = generateATCSlug(code, description, lang);
    return `/${lang}/classifications/${slug}`;
  });
}

/**
 * Generate alternates for chapter-iv pages
 */
export function generateChapterIVAlternates(chapter: string, paragraph: string) {
  return generateAlternates((lang) => `/${lang}/chapter-iv/${chapter}/${paragraph}`);
}

/**
 * Generate alternates for static pages
 */
export function generateStaticAlternates(path: '' | 'search') {
  return generateAlternates((lang) => path ? `/${lang}/${path}` : `/${lang}`);
}
