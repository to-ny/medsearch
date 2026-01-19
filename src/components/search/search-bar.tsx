'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useDebounce, useLinks, useTranslation } from '@/lib/hooks';
import { detectCNKInput } from '@/lib/utils/cnk';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'normal' | 'large';
  onSearch?: (query: string) => void;
  className?: string;
  /** Enable CNK detection and filtering (default: true) */
  enableCNKDetection?: boolean;
}

export function SearchBar({
  defaultValue = '',
  placeholder,
  autoFocus = false,
  size = 'normal',
  onSearch,
  className,
  enableCNKDetection = true,
}: SearchBarProps) {
  const { t } = useTranslation();
  const links = useLinks();
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debouncedValue = useDebounce(value, 300);
  const resolvedPlaceholder = placeholder ?? t('common.searchPlaceholder');

  // Detect if input looks like a CNK code
  const isCNKSearch = useMemo(
    () => enableCNKDetection && detectCNKInput(value.trim()),
    [value, enableCNKDetection]
  );

  // Handle debounced search loading state
  useEffect(() => {
    if (debouncedValue.length >= 3) {
      // Use a micro-task to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setIsLoading(true);
        // Reset loading state after a brief moment
        const resetTimer = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(resetTimer);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [debouncedValue]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length >= 3) {
        if (onSearch) {
          onSearch(trimmed);
        } else {
          // If CNK detected, filter to AMPP type only
          const isCNK = enableCNKDetection && detectCNKInput(trimmed);
          router.push(
            links.toSearch({
              q: trimmed,
              ...(isCNK && { types: 'ampp' }),
            })
          );
        }
      }
    },
    [value, onSearch, router, links, enableCNKDetection]
  );

  const handleClear = useCallback(() => {
    setValue('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const sizeStyles = size === 'large'
    ? 'py-4 px-6 text-lg rounded-xl'
    : 'py-2.5 px-4 text-sm rounded-lg';

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <div className="relative">
        <MagnifyingGlassIcon
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
            size === 'large' ? 'h-6 w-6' : 'h-5 w-5'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          autoFocus={autoFocus}
          className={cn(
            'block w-full border border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-shadow',
            sizeStyles,
            size === 'large' ? 'pl-14 pr-14' : 'pl-10 pr-10'
          )}
          aria-label="Search"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <svg
              className={cn(
                'animate-spin text-gray-400',
                size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
              )}
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
          )}
          {value && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <XMarkIcon className={cn(
                'text-gray-400',
                size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
              )} />
            </button>
          )}
        </div>
      </div>
      {/* CNK indicator or "type at least" message - with proper spacing */}
      <div className="mt-2 mb-4 min-h-[24px]">
        {isCNKSearch ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            )}
            role="status"
            aria-live="polite"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            {t('pharmacist.cnkDetected')} - {t('entityLabels.package')}
          </span>
        ) : (
          value.length > 0 && value.length < 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('common.typeAtLeast')}
            </p>
          )
        )}
      </div>
    </form>
  );
}
