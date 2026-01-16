import { NextRequest, NextResponse } from 'next/server';
import { getExcipients } from '@/lib/services/excipients';
import { createCacheHeaders } from '@/lib/cache';
import type { ErrorResponse } from '@/lib/types';

// Excipient data: 24 hour revalidation (static data)
export const revalidate = 86400;

export interface ExcipientApiResponse {
  text?: string;
  language?: string;
  allTexts: { language: string; text: string }[];
  hasRequestedLanguage: boolean;
}

/**
 * GET /api/excipients?ampCode=SAM123456-00&lang=en
 * Get excipient information for a medication by AMP code
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ExcipientApiResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const ampCode = searchParams.get('ampCode');
  const language = (searchParams.get('lang') as 'fr' | 'nl' | 'de' | 'en') || 'fr';

  if (!ampCode) {
    return NextResponse.json(
      { code: 'MISSING_PARAM', message: 'ampCode parameter is required' },
      { status: 400 }
    );
  }

  // Validate AMP code format
  if (!/^SAM\d{6}-\d{2}$/.test(ampCode)) {
    return NextResponse.json(
      { code: 'INVALID_FORMAT', message: 'Invalid AMP code format. Expected SAM followed by 6 digits, hyphen, and 2 digits.' },
      { status: 400 }
    );
  }

  const result = getExcipients(ampCode, language);

  if (!result) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'No excipient data found for this medication' },
      { status: 404 }
    );
  }

  return NextResponse.json(result, {
    headers: createCacheHeaders('referenceData'),
  });
}
