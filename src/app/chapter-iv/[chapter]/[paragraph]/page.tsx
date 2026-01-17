import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChapterIVParagraphWithRelations } from '@/server/queries/chapter-iv';
import { getLocalizedText } from '@/server/utils/localization';
import { ChapterIVDetail } from '@/components/detail/chapter-iv-detail';

interface Props {
  params: Promise<{ chapter: string; paragraph: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapter, paragraph } = await params;
  const chapterIV = await getChapterIVParagraphWithRelations(chapter, paragraph);

  if (!chapterIV) {
    return { title: 'Not Found' };
  }

  const keyString = chapterIV.keyString ? getLocalizedText(chapterIV.keyString, 'en') : '';
  return {
    title: `Chapter ${chapter} - ${paragraph}`,
    description: `Chapter IV paragraph ${paragraph}${keyString ? `: ${keyString}` : ''} - Prior authorization requirements.`,
  };
}

export default async function ChapterIVPage({ params }: Props) {
  const { chapter, paragraph } = await params;
  const chapterIV = await getChapterIVParagraphWithRelations(chapter, paragraph);

  if (!chapterIV) {
    notFound();
  }

  return <ChapterIVDetail chapterIV={chapterIV} />;
}
