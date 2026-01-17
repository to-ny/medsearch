import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVMPWithRelations } from '@/server/queries/vmp';
import { getLocalizedText } from '@/server/utils/localization';
import { VMPDetail } from '@/components/detail/vmp-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const vmp = await getVMPWithRelations(code);

  if (!vmp) {
    return { title: 'Not Found' };
  }

  const name = getLocalizedText(vmp.name, 'en');
  return {
    title: name,
    description: `${name} - Generic product with ${vmp.amps.length} brand products available.`,
  };
}

export default async function VMPPage({ params }: Props) {
  const { code } = await params;
  const vmp = await getVMPWithRelations(code);

  if (!vmp) {
    notFound();
  }

  return <VMPDetail vmp={vmp} />;
}
