import { NextRequest, NextResponse } from 'next/server';
import { getStandardDosagesByVmpGroup } from '@/lib/services/dosage';
import { createCacheHeaders } from '@/lib/cache';
import type { StandardDosage, ErrorResponse } from '@/lib/types';

// Clinical reference data: 7 day revalidation (REVALIDATE_TIMES.REFERENCE_DATA)
export const revalidate = 604800;

interface RouteParams {
  params: Promise<{ vmpGroupCode: string }>;
}

export interface DosagesResponse {
  dosages: StandardDosage[];
  totalCount: number;
}

/**
 * GET /api/dosages/[vmpGroupCode]
 * Get standard dosage recommendations by VmpGroup code
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DosagesResponse | ErrorResponse>> {
  const { vmpGroupCode } = await params;

  // Validate VmpGroup code format (should be a number)
  if (!/^\d+$/.test(vmpGroupCode)) {
    return NextResponse.json(
      { code: 'INVALID_CODE', message: 'VmpGroup code must be a number' },
      { status: 400 }
    );
  }

  try {
    const result = await getStandardDosagesByVmpGroup(vmpGroupCode);

    if (!result.success) {
      return NextResponse.json(
        { code: result.error?.code || 'NOT_FOUND', message: result.error?.message || 'Dosages not found' },
        { status: 404 }
      );
    }

    const response: DosagesResponse = {
      dosages: result.data || [],
      totalCount: result.data?.length || 0,
    };

    return NextResponse.json(response, {
      headers: createCacheHeaders('medications'),
    });
  } catch (error) {
    console.error('Dosage fetch error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
