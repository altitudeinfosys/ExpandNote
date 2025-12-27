/**
 * Versioning system constants
 *
 * These constants control the behavior of the note version history system.
 */

/**
 * Maximum number of versions to retain per note.
 * Older versions beyond this limit are automatically deleted.
 */
export const VERSION_RETENTION_LIMIT = 5;

/**
 * Character count threshold for significant content changes.
 * Versions are created when content changes by more than this amount.
 */
export const SIGNIFICANT_CHANGE_THRESHOLD = 100;

/**
 * Frequency of auto-save versioning.
 * A version is created every Nth auto-save.
 */
export const AUTO_SAVE_VERSION_FREQUENCY = 5;
