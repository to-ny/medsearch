import type { Metadata } from 'next';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ClientLayout } from '@/components/layout/ClientLayout';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Health-search | Belgium Medication Database',
  description: 'Search and compare medications from Belgium\'s official SAM database. Find prices, reimbursement info, generic equivalents, and more.',
  keywords: ['medication', 'Belgium', 'pharmacy', 'drugs', 'reimbursement', 'CNK', 'generic'],
};

// Validate nonce is valid base64 (defense in depth against header injection)
function isValidNonce(nonce: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(nonce) && nonce.length >= 16 && nonce.length <= 64;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawNonce = (await headers()).get('x-nonce') ?? '';
  const nonce = isValidNonce(rawNonce) ? rawNonce : '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.__webpack_nonce__ = "${nonce}";`,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-50 font-sans antialiased dark:bg-gray-900`}
      >
        <QueryProvider>
          <ClientLayout>{children}</ClientLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
