// Shared constants between web and mobile

// Note limits
export const MAX_TAGS_PER_NOTE = 5;
export const MAX_CONTENT_SIZE = 1024 * 1024; // 1MB
export const MAX_TITLE_LENGTH = 500;

// Timing
export const AUTO_SAVE_DELAY_MS = 2000;
export const SEARCH_DEBOUNCE_MS = 300;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MIN_SEARCH_QUERY_LENGTH = 2;

// Rate limits
export const MAX_AI_EXECUTIONS_PER_MINUTE = 10;

// Attachment limits
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
