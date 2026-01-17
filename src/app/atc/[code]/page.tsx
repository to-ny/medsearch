import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getATCWithRelations, getATCHierarchy } from '@/server/queries/atc';
import { ATCDetail } from '@/components/detail/atc-detail';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const atc = await getATCWithRelations(code);

  if (!atc) {
    return { title: 'Not Found' };
  }

  return {
    title: `${atc.code} - ${atc.description}`,
    description: `${atc.code} ${atc.description} - ATC classification with ${atc.packageCount} products.`,
  };
}

export default async function ATCPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { page } = await searchParams;
  const currentPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  const [atc, hierarchy] = await Promise.all([
    getATCWithRelations(code, limit, offset),
    getATCHierarchy(code),
  ]);

  if (!atc) {
    notFound();
  }

  return <ATCDetail atc={atc} hierarchy={hierarchy} currentPage={currentPage} pageSize={limit} />;
}
