import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Configuration
const ALLOWED_HOSTNAME = 'app.fagg-afmps.be'; // Exact match only (no subdomains)
const ALLOWED_PATH_PREFIX = '/pharma-status/api/files/'; // Restrict to document files
const FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit
const ALLOWED_CONTENT_TYPES = ['application/pdf'];

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `doc-proxy:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Exact hostname match (no subdomains)
    if (parsed.hostname !== ALLOWED_HOSTNAME) {
      return false;
    }
    // Path must start with allowed prefix
    if (!parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
      return false;
    }
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    );
  }

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedSearch/1.0',
      },
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects (security)
    });

    clearTimeout(timeoutId);

    // Reject redirects (prevent redirect-based attacks)
    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ error: 'Redirects not allowed' }, { status: 403 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: response.status });
    }

    // Validate Content-Type
    const contentType = response.headers.get('content-type') || '';
    const isAllowedContentType = ALLOWED_CONTENT_TYPES.some((allowed) =>
      contentType.toLowerCase().includes(allowed)
    );
    if (!isAllowedContentType) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Check file size before downloading
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buffer = await response.arrayBuffer();

    // Double-check size after download (in case Content-Length was missing/wrong)
    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }

    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
