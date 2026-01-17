import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAMPWithRelations } from '@/server/queries/amp';
import { getLocalizedText } from '@/server/utils/localization';
import { AMPDetail } from '@/components/detail/amp-detail';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const amp = await getAMPWithRelations(code);

  if (!amp) {
    return { title: 'Not Found' };
  }

  const name = getLocalizedText(amp.name, 'en');
  const company = amp.company?.denomination;
  return {
    title: name,
    description: `${name}${company ? ` by ${company}` : ''} - Brand medication with ${amp.packages.length} package${amp.packages.length !== 1 ? 's' : ''} available.`,
  };
}

export default async function AMPPage({ params }: Props) {
  const { code } = await params;
  const amp = await getAMPWithRelations(code);

  if (!amp) {
    notFound();
  }

  return <AMPDetail amp={amp} />;
}
