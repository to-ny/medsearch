'use client';

import { useState, useRef } from 'react';
import { BatchLookupForm } from '@/components/pharmacist/BatchLookupForm';
import { BatchResultsTable } from '@/components/pharmacist/BatchResultsTable';
import { useTranslation } from '@/lib/hooks';
import type { BatchLookupResponse } from '@/server/actions/batch-lookup';

const initialResponse: BatchLookupResponse = {
  success: false,
  results: [],
  notFound: [],
  errors: [],
  warnings: [],
  totalRequested: 0,
  totalFound: 0,
};

// Valid CNK codes with their product descriptions
const EXAMPLE_CNK_CODES = [
  { code: '0039347', name: 'Dafalgan 500mg' },
  { code: '1449834', name: 'Dafalgan Forte 1g' },
  { code: '4380101', name: 'Omeprazol AB 10mg' },
  { code: '3491859', name: 'Amoxicilline EG' },
  { code: '2601581', name: 'Itraconazol Sandoz' },
];

/**
 * Client wrapper for batch lookup functionality
 */
export function BatchLookupClient() {
  const { t } = useTranslation();
  const [response, setResponse] = useState<BatchLookupResponse>(initialResponse);
  const [hasSearched, setHasSearched] = useState(false);
  const formRef = useRef<{ setInput: (value: string) => void; appendInput: (value: string) => void; getInput: () => string } | null>(null);

  const handleResults = (newResponse: BatchLookupResponse) => {
    setResponse(newResponse);
    setHasSearched(true);
  };

  const handleExampleClick = (code: string) => {
    if (formRef.current) {
      formRef.current.appendInput(code);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <BatchLookupForm ref={formRef} onResults={handleResults} />
      </div>

      {/* Example codes - clickable, append on click */}
      {!hasSearched && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('pharmacist.tryThese')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CNK_CODES.map(({ code, name }) => (
              <button
                key={code}
                onClick={() => handleExampleClick(code)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-mono text-gray-900 dark:text-gray-100">{code}</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BatchResultsTable response={response} />
        </div>
      )}
    </div>
  );
}
