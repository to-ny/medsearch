import { NextRequest, NextResponse } from 'next/server';

interface CSPViolationReport {
  'csp-report'?: {
    'document-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'blocked-uri'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Reports are logged for monitoring and debugging purposes.
 *
 * In production, consider forwarding to a dedicated logging/monitoring service.
 */
export async function POST(request: NextRequest) {
  try {
    const report: CSPViolationReport = await request.json();
    const violation = report['csp-report'];

    if (violation) {
      // Log the violation for monitoring
      // In production, this goes to Vercel's logging infrastructure
      console.warn('[CSP Violation]', {
        documentUri: violation['document-uri'],
        violatedDirective: violation['violated-directive'],
        effectiveDirective: violation['effective-directive'],
        blockedUri: violation['blocked-uri'],
        sourceFile: violation['source-file'],
        lineNumber: violation['line-number'],
        columnNumber: violation['column-number'],
      });
    }

    // Return 204 No Content (standard response for report endpoints)
    return new NextResponse(null, { status: 204 });
  } catch {
    // Silently accept malformed reports to avoid noise
    return new NextResponse(null, { status: 204 });
  }
}
