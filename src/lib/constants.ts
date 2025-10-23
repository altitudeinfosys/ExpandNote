/**
 * Application-wide constants
 */

// Note constraints
export const MAX_CONTENT_SIZE_BYTES = 1024 * 1024; // 1MB
export const MAX_TITLE_LENGTH = 500; // characters
export const MAX_TAGS_PER_NOTE = 5;

// Auto-save configuration
export const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Search
export const MIN_SEARCH_QUERY_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 300;
