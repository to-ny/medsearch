import type { Metadata } from 'next';
import { getCompanyByActorNr } from '@/lib/services/company';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ actorNr: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { actorNr } = await params;
  const result = await getCompanyByActorNr(actorNr, 'en');

  if (!result.success || !result.data) {
    return {
      title: 'Company Not Found | MedSearch',
      description: 'The requested pharmaceutical company could not be found.',
    };
  }

  const company = result.data;
  const locationParts = [company.address?.city, company.address?.countryCode].filter(Boolean);
  const locationText = locationParts.length > 0 ? ` based in ${locationParts.join(', ')}` : '';

  const description = `${company.name}${locationText}. View company information, contact details, and browse medications from this pharmaceutical manufacturer.`;

  return {
    title: `${company.name} | MedSearch`,
    description,
    openGraph: {
      title: company.name,
      description,
      type: 'website',
    },
  };
}

export default function CompanyLayout({ children }: LayoutProps) {
  return children;
}
