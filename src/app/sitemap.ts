import type { MetadataRoute } from 'next';
import { sql } from '@/server/db/client';
import { generateEntitySlug, generateCompanySlug, generateATCSlug } from '@/lib/utils/slug';
import type { Language, MultilingualText } from '@/server/types/domain';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://medsearch.be';
const LANGUAGES: Language[] = ['nl', 'fr', 'de', 'en'];

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = [];

  // Static pages for all languages
  const now = new Date();
  for (const lang of LANGUAGES) {
    entries.push({
      url: `${BASE_URL}/${lang}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    });
    entries.push({
      url: `${BASE_URL}/${lang}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    });
  }

  // Fetch VTMs
  const vtmResult = await sql`
    SELECT code, name FROM vtm
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY code
  `;

  for (const vtm of vtmResult.rows) {
    const code = vtm.code as string;
    const name = vtm.name as MultilingualText | null;

    for (const lang of LANGUAGES) {
      const slug = generateEntitySlug(name, code, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/substances/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  // Fetch VMPs
  const vmpResult = await sql`
    SELECT code, name FROM vmp
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY code
  `;

  for (const vmp of vmpResult.rows) {
    const code = vmp.code as string;
    const name = vmp.name as MultilingualText | null;

    for (const lang of LANGUAGES) {
      const slug = generateEntitySlug(name, code, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/generics/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  // Fetch AMPs
  const ampResult = await sql`
    SELECT code, name FROM amp
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY code
  `;

  for (const amp of ampResult.rows) {
    const code = amp.code as string;
    const name = amp.name as MultilingualText | null;

    for (const lang of LANGUAGES) {
      const slug = generateEntitySlug(name, code, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/medications/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  }

  // Fetch AMPPs
  const amppResult = await sql`
    SELECT cti_extended, prescription_name FROM ampp
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY cti_extended
  `;

  for (const ampp of amppResult.rows) {
    const ctiExtended = ampp.cti_extended as string;
    const name = ampp.prescription_name as MultilingualText | null;

    for (const lang of LANGUAGES) {
      const slug = generateEntitySlug(name, ctiExtended, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/packages/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  // Fetch Companies
  const companyResult = await sql`
    SELECT actor_nr, denomination FROM company
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY actor_nr
  `;

  for (const company of companyResult.rows) {
    const actorNr = company.actor_nr as string;
    const denomination = company.denomination as string;
    const slug = generateCompanySlug(denomination, actorNr);

    for (const lang of LANGUAGES) {
      entries.push({
        url: `${BASE_URL}/${lang}/companies/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  // Fetch VMP Groups
  const vmpGroupResult = await sql`
    SELECT code, name FROM vmp_group
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY code
  `;

  for (const group of vmpGroupResult.rows) {
    const code = group.code as string;
    const name = group.name as MultilingualText | null;

    for (const lang of LANGUAGES) {
      const slug = generateEntitySlug(name, code, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/therapeutic-groups/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  // Fetch ATC Classifications
  const atcResult = await sql`
    SELECT code, description FROM atc_classification
    ORDER BY code
  `;

  for (const atc of atcResult.rows) {
    const code = atc.code as string;
    const description = atc.description as string;
    // ATC description is single-language, create MultilingualText
    const descriptionText: MultilingualText = { nl: description };

    for (const lang of LANGUAGES) {
      const slug = generateATCSlug(code, descriptionText, lang);
      entries.push({
        url: `${BASE_URL}/${lang}/classifications/${slug}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  // Fetch Chapter IV Paragraphs
  const chapterIVResult = await sql`
    SELECT chapter_name, paragraph_name FROM chapter_iv_paragraph
    WHERE end_date IS NULL OR end_date > NOW()
    ORDER BY chapter_name, paragraph_name
  `;

  for (const paragraph of chapterIVResult.rows) {
    const chapter = paragraph.chapter_name as string;
    const paragraphName = paragraph.paragraph_name as string;

    for (const lang of LANGUAGES) {
      entries.push({
        url: `${BASE_URL}/${lang}/chapter-iv/${chapter}/${paragraphName}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return entries;
}
