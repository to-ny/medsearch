'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export type SearchType = 'name' | 'cnk' | 'ingredient';

export interface SearchBarProps {
  onSearch: (query: string, type: SearchType) => void;
  loading?: boolean;
  placeholder?: string;
  initialQuery?: string;
  initialType?: SearchType;
}

export function SearchBar({
  onSearch,
  loading = false,
  placeholder,
  initialQuery = '',
  initialType = 'name',
}: SearchBarProps) {
  const t = useTranslations();
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const searchTypeLabels: Record<SearchType, string> = {
    name: t('search.byName'),
    cnk: t('search.byCNK'),
    ingredient: t('search.byIngredient'),
  };

  const searchTypePlaceholders: Record<SearchType, string> = {
    name: t('search.placeholderName'),
    cnk: t('search.placeholderCNK'),
    ingredient: t('search.placeholderIngredient'),
  };

  // Dynamic placeholder based on search type (custom placeholder overrides)
  const effectivePlaceholder = placeholder || searchTypePlaceholders[searchType];

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTypeMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 3 || (searchType === 'cnk' && query.trim().length === 7)) {
      onSearch(query.trim(), searchType);
    }
  }, [query, searchType, onSearch]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Auto-detect CNK format
      if (/^\d{7}$/.test(value.trim())) {
        setSearchType('cnk');
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleTypeSelect = useCallback((type: SearchType) => {
    setSearchType(type);
    setShowTypeMenu(false);
  }, []);

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Search Type Dropdown */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="min-w-[120px] justify-between"
            aria-haspopup="listbox"
            aria-expanded={showTypeMenu}
          >
            {searchTypeLabels[searchType]}
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {showTypeMenu && (
            <div
              className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
              role="listbox"
            >
              {(Object.keys(searchTypeLabels) as SearchType[]).map((type) => (
                <button
                  key={type}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    type === searchType ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
                  } ${type === 'name' ? 'rounded-t-lg' : ''} ${type === 'ingredient' ? 'rounded-b-lg' : ''}`}
                  onClick={() => handleTypeSelect(type)}
                  role="option"
                  aria-selected={type === searchType}
                >
                  {searchTypeLabels[type]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="flex-1">
          <Input
            type="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            aria-label={t('search.ariaLabel')}
          />
        </div>

        {/* Search Button */}
        <Button onClick={handleSearch} loading={loading} disabled={query.trim().length < 3}>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="sr-only">Search</span>
        </Button>

      </div>

      {/* Search hints */}
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {searchType === 'cnk'
          ? t('search.hintCNK')
          : searchType === 'ingredient'
          ? t('search.hintIngredient')
          : t('search.hintMinChars')}
      </p>
    </div>
  );
}
