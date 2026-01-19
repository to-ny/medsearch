'use client';

import { useState, useCallback, useTransition, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks';
import { validateBatchInput, CNK_BATCH_LIMIT } from '@/lib/utils/cnk';
import { batchLookupCNK, type BatchLookupResponse } from '@/server/actions/batch-lookup';

interface BatchLookupFormProps {
  onResults: (response: BatchLookupResponse) => void;
  className?: string;
}

export interface BatchLookupFormRef {
  setInput: (value: string) => void;
  appendInput: (value: string) => void;
  getInput: () => string;
}

/**
 * Form for batch CNK code lookup
 */
export const BatchLookupForm = forwardRef<BatchLookupFormRef, BatchLookupFormProps>(function BatchLookupForm({ onResults, className }, ref) {
  const { t } = useTranslation();
  const [input, setInputState] = useState('');
  const [isPending, startTransition] = useTransition();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Real-time validation as user types
  const handleInputChange = useCallback((value: string) => {
    setInputState(value);

    // Only validate if there's meaningful input
    if (value.trim().length > 0) {
      const validation = validateBatchInput(value);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
    } else {
      setValidationErrors([]);
      setValidationWarnings([]);
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setInput: handleInputChange,
    appendInput: (value: string) => {
      const currentInput = input.trim();
      const newInput = currentInput ? `${currentInput}\n${value}` : value;
      handleInputChange(newInput);
    },
    getInput: () => input,
  }), [handleInputChange, input]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validation = validateBatchInput(input);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setValidationWarnings(validation.warnings);
        return;
      }

      startTransition(async () => {
        try {
          const response = await batchLookupCNK(input);
          onResults(response);
        } catch {
          onResults({
            success: false,
            results: [],
            notFound: [],
            errors: ['An unexpected error occurred. Please try again.'],
            warnings: [],
            totalRequested: 0,
            totalFound: 0,
          });
        }
      });
    },
    [input, onResults]
  );

  const handleClear = useCallback(() => {
    setInputState('');
    setValidationErrors([]);
    setValidationWarnings([]);
    onResults({
      success: false,
      results: [],
      notFound: [],
      errors: [],
      warnings: [],
      totalRequested: 0,
      totalFound: 0,
    });
  }, [onResults]);

  // Count valid codes for preview
  const validation = input.trim() ? validateBatchInput(input) : null;
  const validCodeCount = validation?.codes.length ?? 0;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div>
        <label
          htmlFor="cnk-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t('pharmacist.batchInputLabel')}
          {validCodeCount > 0 && (
            <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
              ({validCodeCount} valid code{validCodeCount !== 1 ? 's' : ''})
            </span>
          )}
        </label>
        <textarea
          id="cnk-input"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t('pharmacist.batchInputPlaceholder')}
          rows={6}
          className={cn(
            'block w-full rounded-lg border',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-colors resize-none',
            'px-4 py-3 text-sm font-mono',
            validationErrors.length > 0
              ? 'border-red-300 dark:border-red-600'
              : 'border-gray-300 dark:border-gray-600'
          )}
          aria-describedby={validationErrors.length > 0 ? 'cnk-errors' : undefined}
          disabled={isPending}
        />
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div
          id="cnk-errors"
          className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation warnings */}
      {validationWarnings.length > 0 && validationErrors.length === 0 && (
        <div
          className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-700 dark:text-yellow-400"
          role="status"
        >
          <ul className="list-disc list-inside space-y-1">
            {validationWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Limit indicator */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('pharmacist.maxCodesAllowed').replace('100', String(CNK_BATCH_LIMIT))}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || input.trim().length === 0 || validationErrors.length > 0}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-lg font-medium text-sm',
            'bg-blue-600 text-white hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'dark:focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors min-w-[120px]'
          )}
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('pharmacist.lookingUp')}
            </>
          ) : (
            t('pharmacist.lookup')
          )}
        </button>

        {input.trim().length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className={cn(
              'inline-flex items-center justify-center',
              'px-4 py-2.5 rounded-lg font-medium text-sm',
              'border border-gray-300 dark:border-gray-600',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'dark:focus:ring-offset-gray-900',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {t('pharmacist.clearAll')}
          </button>
        )}
      </div>

    </form>
  );
});
