/**
 * LocalStorage implementation of IStorageService
 */

import type { IStorageService, UserPreferences, RecentSearch } from './types';
import { DEFAULT_PREFERENCES } from './types';

const STORAGE_KEYS = {
  FAVORITES: 'medsearch:favorites',
  RECENT_SEARCHES: 'medsearch:recent-searches',
  PREFERENCES: 'medsearch:preferences',
} as const;

const MAX_RECENT_SEARCHES = 20;

/**
 * Safely get item from localStorage
 */
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage
 */
function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * LocalStorage-based storage service
 */
export class LocalStorageService implements IStorageService {
  // Favorites
  async getFavorites(): Promise<string[]> {
    return getItem<string[]>(STORAGE_KEYS.FAVORITES, []);
  }

  async addFavorite(cnk: string): Promise<void> {
    const favorites = await this.getFavorites();
    if (!favorites.includes(cnk)) {
      favorites.push(cnk);
      setItem(STORAGE_KEYS.FAVORITES, favorites);
    }
  }

  async removeFavorite(cnk: string): Promise<void> {
    const favorites = await this.getFavorites();
    const index = favorites.indexOf(cnk);
    if (index !== -1) {
      favorites.splice(index, 1);
      setItem(STORAGE_KEYS.FAVORITES, favorites);
    }
  }

  async isFavorite(cnk: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.includes(cnk);
  }

  // Recent searches
  async getRecentSearches(): Promise<RecentSearch[]> {
    return getItem<RecentSearch[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
  }

  async addRecentSearch(search: Omit<RecentSearch, 'timestamp'>): Promise<void> {
    const searches = await this.getRecentSearches();

    // Remove duplicate if exists
    const existingIndex = searches.findIndex(
      (s) => s.query === search.query && s.type === search.type
    );
    if (existingIndex !== -1) {
      searches.splice(existingIndex, 1);
    }

    // Add new search at beginning
    searches.unshift({
      ...search,
      timestamp: Date.now(),
    });

    // Trim to max size
    if (searches.length > MAX_RECENT_SEARCHES) {
      searches.length = MAX_RECENT_SEARCHES;
    }

    setItem(STORAGE_KEYS.RECENT_SEARCHES, searches);
  }

  async clearRecentSearches(): Promise<void> {
    setItem(STORAGE_KEYS.RECENT_SEARCHES, []);
  }

  // Preferences
  async getPreferences(): Promise<UserPreferences> {
    return getItem<UserPreferences>(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  }

  async setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    setItem(STORAGE_KEYS.PREFERENCES, { ...current, ...prefs });
  }

  // Excluded ingredients
  async getExcludedIngredients(): Promise<string[]> {
    const prefs = await this.getPreferences();
    return prefs.excludedIngredients;
  }

  async addExcludedIngredient(ingredient: string): Promise<void> {
    const prefs = await this.getPreferences();
    if (!prefs.excludedIngredients.includes(ingredient)) {
      prefs.excludedIngredients.push(ingredient);
      await this.setPreferences({ excludedIngredients: prefs.excludedIngredients });
    }
  }

  async removeExcludedIngredient(ingredient: string): Promise<void> {
    const prefs = await this.getPreferences();
    const index = prefs.excludedIngredients.indexOf(ingredient);
    if (index !== -1) {
      prefs.excludedIngredients.splice(index, 1);
      await this.setPreferences({ excludedIngredients: prefs.excludedIngredients });
    }
  }
}

// Singleton instance
export const storageService = new LocalStorageService();
