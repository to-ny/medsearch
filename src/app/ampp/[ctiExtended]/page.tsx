import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAMPPWithRelations } from '@/server/queries/ampp';
import { getLocalizedText } from '@/server/utils/localization';
import { AMPPDetail } from '@/components/detail/ampp-detail';

interface Props {
  params: Promise<{ ctiExtended: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ctiExtended } = await params;
  const ampp = await getAMPPWithRelations(ctiExtended);

  if (!ampp) {
    return { title: 'Not Found' };
  }

  const name = ampp.prescriptionName
    ? getLocalizedText(ampp.prescriptionName, 'en')
    : getLocalizedText(ampp.amp.name, 'en');
  return {
    title: name,
    description: `${name} - Package details including pricing, CNK codes, and reimbursement information.`,
  };
}

export default async function AMPPPage({ params }: Props) {
  const { ctiExtended } = await params;
  const ampp = await getAMPPWithRelations(ctiExtended);

  if (!ampp) {
    notFound();
  }

  return <AMPPDetail ampp={ampp} />;
}
