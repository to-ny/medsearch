import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVMPGroupWithRelations } from '@/server/queries/vmp-group';
import { getLocalizedText } from '@/server/utils/localization';
import { VMPGroupDetail } from '@/components/detail/vmp-group-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const vmpGroup = await getVMPGroupWithRelations(code);

  if (!vmpGroup) {
    return { title: 'Not Found' };
  }

  const name = getLocalizedText(vmpGroup.name, 'en');
  return {
    title: name,
    description: `${name} - Therapeutic group with ${vmpGroup.vmps.length} generic products and ${vmpGroup.dosages.length} dosage recommendations.`,
  };
}

export default async function VMPGroupPage({ params }: Props) {
  const { code } = await params;
  const vmpGroup = await getVMPGroupWithRelations(code);

  if (!vmpGroup) {
    notFound();
  }

  return <VMPGroupDetail vmpGroup={vmpGroup} />;
}
