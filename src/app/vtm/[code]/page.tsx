import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVTMWithRelations } from '@/server/queries/vtm';
import { getLocalizedText } from '@/server/utils/localization';
import { VTMDetail } from '@/components/detail/vtm-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const vtm = await getVTMWithRelations(code);

  if (!vtm) {
    return { title: 'Not Found' };
  }

  const name = getLocalizedText(vtm.name, 'en');
  return {
    title: name,
    description: `${name} - Active substance with ${vtm.vmps.length} generic products and ${vtm.ampCount} brand products.`,
  };
}

export default async function VTMPage({ params }: Props) {
  const { code } = await params;
  const vtm = await getVTMWithRelations(code);

  if (!vtm) {
    notFound();
  }

  return <VTMDetail vtm={vtm} />;
}
