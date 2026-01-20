'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useDebounce, useLinks, useTranslation } from '@/lib/hooks';
import { detectCNKInput } from '@/lib/utils/cnk';

const RECENT_SEARCHES_KEY = 'medsearch_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;
  try {
    const searches = getRecentSearches();
    // Remove if already exists and add to front
    const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

function removeRecentSearch(query: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const searches = getRecentSearches();
    const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'normal' | 'large';
  onSearch?: (query: string) => void;
  className?: string;
  /** Enable CNK detection and filtering (default: true) */
  enableCNKDetection?: boolean;
  /** Show recent searches dropdown (default: true) */
  showRecentSearches?: boolean;
}

export function SearchBar({
  defaultValue = '',
  placeholder,
  autoFocus = false,
  size = 'normal',
  onSearch,
  className,
  enableCNKDetection = true,
  showRecentSearches = true,
}: SearchBarProps) {
  const { t } = useTranslation();
  const links = useLinks();
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debouncedValue = useDebounce(value, 300);
  const resolvedPlaceholder = placeholder ?? t('common.searchPlaceholder');

  // Initialize recent searches from localStorage (use lazy initial state to avoid effect)
  const [hasInitialized, setHasInitialized] = useState(false);
  if (!hasInitialized && showRecentSearches && typeof window !== 'undefined') {
    setHasInitialized(true);
    const stored = getRecentSearches();
    if (stored.length > 0) {
      setRecentSearches(stored);
    }
  }

  // Show dropdown when focused, input is empty, and there are recent searches
  const showDropdown = showRecentSearches && isFocused && value.length === 0 && recentSearches.length > 0;

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

  const executeSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length >= 3) {
        // Save to recent searches
        addRecentSearch(trimmed);
        setRecentSearches(getRecentSearches());

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
        setIsFocused(false);
      }
    },
    [onSearch, router, links, enableCNKDetection]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      executeSearch(value);
    },
    [value, executeSearch]
  );

  const handleRecentSearchClick = useCallback(
    (query: string) => {
      setValue(query);
      executeSearch(query);
    },
    [executeSearch]
  );

  const handleRemoveRecentSearch = useCallback(
    (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      const updated = removeRecentSearch(query);
      setRecentSearches(updated);
    },
    []
  );

  const handleClear = useCallback(() => {
    setValue('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue('');
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Refresh recent searches on focus
    if (showRecentSearches) {
      setRecentSearches(getRecentSearches());
    }
  }, [showRecentSearches]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if clicking inside the dropdown
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={resolvedPlaceholder}
          autoFocus={autoFocus}
          autoComplete="off"
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
          role="combobox"
          aria-controls="recent-searches-listbox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
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

        {/* Recent searches dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            id="recent-searches-listbox"
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
            role="listbox"
            aria-label={t('search.recentSearches')}
          >
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              {t('search.recentSearches')}
            </div>
            <ul>
              {recentSearches.map((search) => (
                <li key={search}>
                  <button
                    type="button"
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="option"
                    aria-selected="false"
                  >
                    <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate">{search}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecentSearch(e, search)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                      aria-label={`Remove ${search} from recent searches`}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
