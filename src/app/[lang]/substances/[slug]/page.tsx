import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getVTMWithRelations } from '@/server/queries/vtm';
import { getLocalizedText } from '@/server/utils/localization';
import { VTMDetail } from '@/components/detail/vtm-detail';
import { extractIdFromSlug, generateEntitySlug } from '@/lib/utils/slug';
import { generateEntityAlternates } from '@/lib/utils/seo';
import type { Language } from '@/server/types/domain';

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const code = extractIdFromSlug(slug);

  const vtm = await getVTMWithRelations(code);
  if (vtm) {
    const name = getLocalizedText(vtm.name, lang as Language);
    return {
      title: name,
      description: `${name} - Active substance with ${vtm.vmps.length} generic products and ${vtm.amps.length} brand products.`,
      alternates: generateEntityAlternates('substances', vtm.name, code),
    };
  }

  return { title: 'Not Found' };
}

export default async function SubstancePage({ params }: Props) {
  const { lang, slug } = await params;
  const code = extractIdFromSlug(slug);

  const vtm = await getVTMWithRelations(code);
  if (vtm) {
    const expectedSlug = generateEntitySlug(vtm.name, code, lang as Language);
    if (slug !== expectedSlug) {
      redirect(`/${lang}/substances/${expectedSlug}`);
    }
    return <VTMDetail vtm={vtm} />;
  }

  notFound();
}
