// Database exports
// Platform-specific database is automatically selected by Metro bundler
// - database.native.ts for iOS/Android (uses expo-sqlite)
// - database.web.ts for web (uses in-memory storage)
export { database } from './database';
export {
  SCHEMA_VERSION,
  TABLES,
  type LocalNote,
  type LocalTag,
  type LocalNoteTag,
  type LocalAIProfile,
  type SyncQueueItem,
  type SyncOperation,
  type SyncQueueStatus,
  type SyncMetadata,
} from './schema';
