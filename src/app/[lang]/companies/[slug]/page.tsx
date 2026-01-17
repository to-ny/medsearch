import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCompanyWithRelations } from '@/server/queries/company';
import { CompanyDetail } from '@/components/detail/company-detail';
import { extractIdFromSlug, generateCompanySlug } from '@/lib/utils/slug';
import { generateCompanyAlternates } from '@/lib/utils/seo';

interface Props {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const actorNr = extractIdFromSlug(slug);
  const company = await getCompanyWithRelations(actorNr);

  if (!company) {
    return { title: 'Not Found' };
  }

  return {
    title: company.denomination,
    description: `${company.denomination} - Pharmaceutical company with ${company.productCount} products in the Belgian medication database.`,
    alternates: generateCompanyAlternates(company.denomination, actorNr),
  };
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { page } = await searchParams;
  const actorNr = extractIdFromSlug(slug);
  const currentPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const company = await getCompanyWithRelations(actorNr, limit, offset);

  if (!company) {
    notFound();
  }

  // Verify slug matches expected format, redirect if needed
  const expectedSlug = generateCompanySlug(company.denomination, actorNr);
  if (slug !== expectedSlug) {
    redirect(`/${lang}/companies/${expectedSlug}`);
  }

  return <CompanyDetail company={company} currentPage={currentPage} pageSize={limit} />;
}
