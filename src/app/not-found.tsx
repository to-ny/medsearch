import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | MedSearch',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6">
          <span className="text-7xl font-bold text-gray-200 dark:text-gray-700">404</span>
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <svg
            className="h-8 w-8 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or deleted.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Search medications
          </Link>
          <Link
            href="/companies"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Browse companies
          </Link>
        </div>
      </div>
    </div>
  );
}
