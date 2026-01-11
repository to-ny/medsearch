import type { Metadata } from 'next';
import { getAmpDetail } from '@/lib/services/amp';
import { getPrimaryPrice } from '@/lib/utils/price';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ cnk: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { cnk } = await params;
  const result = await getAmpDetail(cnk, 'en');

  if (!result.success || !result.data) {
    return {
      title: 'Medication Not Found | MedSearch',
      description: 'The requested medication could not be found.',
    };
  }

  const medication = result.data;
  const price = getPrimaryPrice(medication);
  const priceText = price ? ` - €${price.toFixed(2)}` : '';
  const companyText = medication.companyActorNr ? ` by ${medication.companyActorNr}` : '';

  const description = `${medication.name}${priceText}${companyText}. View detailed information, ingredients, reimbursement status, and compare prices with generic alternatives.`;

  return {
    title: `${medication.name} | MedSearch`,
    description,
    openGraph: {
      title: medication.name,
      description,
      type: 'website',
    },
  };
}

export default function MedicationLayout({ children }: LayoutProps) {
  return children;
}
