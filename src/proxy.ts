import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter using sliding window
//
// LIMITATION: In serverless environments (Vercel, AWS Lambda), each instance has its own
// rate limit map. This means rate limiting is per-instance only.
//
// This is acceptable for this app because:
// 1. The app serves public health information (no sensitive write operations)
// 2. The external SAM API has its own rate limits as a secondary protection
// 3. Per-instance limiting still provides basic DDoS protection
//
// For stricter requirements, migrate to: Vercel KV, Upstash Redis, or similar distributed store.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { limited: true, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Build production CSP header with nonce
 *
 * Security approach:
 * - Scripts: nonce-based (critical for XSS protection)
 * - Styles: 'unsafe-inline' (pragmatic tradeoff - React/Tailwind use inline styles,
 *   and style-based XSS is rare and harder to exploit than script-based XSS)
 */
function buildProductionCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://samws.riziv.fgov.be https://apps.samdb.ehealth.fgov.be",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "report-uri /api/csp-report",
  ].join("; ");
}

/**
 * Build development CSP header (permissive)
 *
 * Allows 'unsafe-eval' for Next.js hot reload and dev tools.
 * This is the ACTIVE policy in development - it won't block anything.
 */
function buildDevelopmentCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://samws.riziv.fgov.be https://apps.samdb.ehealth.fgov.be ws://localhost:* ws://127.0.0.1:*",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle API routes - rate limiting (except CSP report endpoint)
  if (pathname.startsWith('/api/') && pathname !== '/api/csp-report') {
    const ip = getClientIP(request);
    const { limited, remaining, resetIn } = isRateLimited(ip);

    if (limited) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(resetIn / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));
    return response;
  }

  // Handle page routes - add CSP with nonce
  const nonce = generateNonce();

  // Clone request headers and add nonce for the app to use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (isDevelopment) {
    // Development: Use permissive CSP as active policy (allows dev tools)
    // Add production CSP as Report-Only to catch issues before deployment
    response.headers.set('Content-Security-Policy', buildDevelopmentCSP());
    response.headers.set('Content-Security-Policy-Report-Only', buildProductionCSP(nonce));
  } else {
    // Production: Use strict nonce-based CSP
    response.headers.set('Content-Security-Policy', buildProductionCSP(nonce));
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
