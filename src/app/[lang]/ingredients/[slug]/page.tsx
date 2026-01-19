import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSubstanceWithRelations } from '@/server/queries/substance';
import { getLocalizedText } from '@/server/utils/localization';
import { SubstanceDetail } from '@/components/detail/substance-detail';
import { extractIdFromSlug, generateEntitySlug } from '@/lib/utils/slug';
import { generateEntityAlternates } from '@/lib/utils/seo';
import type { Language } from '@/server/types/domain';

const PAGE_SIZE = 50;

interface Props {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const code = extractIdFromSlug(slug);

  const substance = await getSubstanceWithRelations(code);
  if (substance) {
    const name = getLocalizedText(substance.name, lang as Language);
    return {
      title: name,
      description: `${name} - Ingredient found in ${substance.usedInAmpCount} products.`,
      alternates: generateEntityAlternates('ingredients', substance.name, code),
    };
  }

  return { title: 'Not Found' };
}

export default async function IngredientPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { page: pageParam } = await searchParams;
  const code = extractIdFromSlug(slug);
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const substance = await getSubstanceWithRelations(code, PAGE_SIZE, offset);
  if (substance) {
    const expectedSlug = generateEntitySlug(substance.name, code, lang as Language);
    if (slug !== expectedSlug) {
      redirect(`/${lang}/ingredients/${expectedSlug}`);
    }
    return (
      <SubstanceDetail
        substance={substance}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
      />
    );
  }

  notFound();
}
