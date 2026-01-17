import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { JsonLd } from '@/components/shared/json-ld';

export const metadata: Metadata = {
  title: {
    default: 'MedSearch - Belgium Medication Database',
    template: '%s | MedSearch',
  },
  description: 'Search and explore Belgium\'s medication database. Find medications, substances, brands, and packages.',
  keywords: ['medication', 'Belgium', 'SAM', 'pharmacy', 'drugs', 'healthcare'],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MedSearch',
  url: 'https://medsearch.be',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://medsearch.be/nl/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <JsonLd data={websiteSchema} />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
