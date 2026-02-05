import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_LANGUAGES = new Set(['nl', 'fr', 'de', 'en']);
const DEFAULT_LANGUAGE = 'nl';
const LANGUAGE_COOKIE = 'medsearch-language';

/**
 * Detect preferred language from Accept-Language header
 */
function detectLanguageFromHeader(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header (e.g., "nl-BE,nl;q=0.9,en;q=0.8")
  const languages = acceptLanguage.split(',').map((lang) => {
    const [code, qValue] = lang.trim().split(';q=');
    const quality = qValue ? parseFloat(qValue) : 1;
    const shortCode = code.split('-')[0].toLowerCase();
    return { code: shortCode, quality };
  });

  // Sort by quality and find first valid language
  languages.sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    if (VALID_LANGUAGES.has(code)) {
      return code;
    }
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip API routes, static files, and other special paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.txt')
  ) {
    return NextResponse.next();
  }

  // Get the first path segment (potential language code)
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // Check if the first segment is a valid language
  if (firstSegment && VALID_LANGUAGES.has(firstSegment)) {
    // Already has valid language prefix, continue
    return NextResponse.next();
  }

  // No valid language prefix - need to redirect
  // Determine the best language to use
  let targetLanguage = DEFAULT_LANGUAGE;

  // Check for stored language preference in cookie
  const storedLanguage = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (storedLanguage && VALID_LANGUAGES.has(storedLanguage)) {
    targetLanguage = storedLanguage;
  } else {
    // Try to detect from Accept-Language header for first visit
    const acceptLanguage = request.headers.get('accept-language');
    const detectedLanguage = detectLanguageFromHeader(acceptLanguage);
    if (detectedLanguage) {
      targetLanguage = detectedLanguage;
    }
  }

  // Build the redirect URL
  const newPathname = `/${targetLanguage}${pathname}`;
  const redirectUrl = new URL(newPathname + search, request.url);

  return NextResponse.redirect(redirectUrl, { status: 307 });
}

export const config = {
  // Match all paths except static files and API
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml (sitemap)
     * - robots.txt (robots file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
