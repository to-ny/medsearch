import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCompanyWithRelations } from '@/server/queries/company';
import { CompanyDetail } from '@/components/detail/company-detail';

interface Props {
  params: Promise<{ actorNr: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { actorNr } = await params;
  const company = await getCompanyWithRelations(actorNr);

  if (!company) {
    return { title: 'Not Found' };
  }

  return {
    title: company.denomination,
    description: `${company.denomination} - Pharmaceutical company with ${company.productCount} products in the Belgian medication database.`,
  };
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { actorNr } = await params;
  const { page } = await searchParams;
  const currentPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const company = await getCompanyWithRelations(actorNr, limit, offset);

  if (!company) {
    notFound();
  }

  return <CompanyDetail company={company} currentPage={currentPage} pageSize={limit} />;
}
