# ExpandNote Monorepo + React Native Mobile App Design

**Created:** 2025-01-26
**Status:** In Progress
**Approach:** Worktree-based migration (`feature/monorepo-migration`)

---

## Executive Summary

Convert ExpandNote from a single Next.js web app to a Turborepo monorepo with:
- **apps/web** - Existing Next.js web application
- **apps/mobile** - New React Native (Expo) mobile application
- **packages/shared** - Shared business logic, types, and utilities

The mobile app will be a full replica of the web app with native enhancements.

---

## Target Architecture

```
/ExpandNote
├── apps/
│   ├── web/                    # Next.js 16 (existing, relocated)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── mobile/                 # React Native (Expo)
│       ├── app/                # Expo Router screens
│       ├── components/         # RN components
│       ├── package.json
│       └── app.json
│
├── packages/
│   ├── shared/                 # Shared across web & mobile
│   │   ├── src/
│   │   │   ├── supabase/       # Supabase client & queries
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── utils/          # Date formatting, validation
│   │   │   ├── ai/             # AI provider integrations
│   │   │   └── constants/      # Shared constants
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                     # (Optional) Shared design tokens
│       ├── src/
│       │   ├── colors.ts
│       │   ├── spacing.ts
│       │   └── typography.ts
│       └── package.json
│
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # pnpm workspaces
└── tsconfig.base.json          # Shared TS config
```

---

## Mobile App Feature Parity

### Core Features (Must Have)

| Feature | Web Implementation | Mobile Implementation |
|---------|-------------------|----------------------|
| Notes CRUD | REST API + Zustand | Same API + Zustand |
| Markdown Editor | react-markdown | react-native-markdown-display |
| Auto-save | 2s debounce | Same logic |
| Tags (max 5) | Tag chips | Native tag picker |
| Search | Full-text PostgreSQL | Same API |
| Favorites/Archive/Trash | Filter flags | Same logic |
| Version History | API + modal | Native sheet |
| AI Profiles | Full CRUD + execute | Same API |
| 40+ AI Models | OpenAI/Claude/OpenRouter | Same API |
| Email-to-Note | Resend webhook | Works as-is |
| Offline Sync | IndexedDB | SQLite (Expo SQLite) |
| Theme (Light/Dark) | next-themes | Expo appearance |
| Auth | Supabase email/password | Same + biometrics |

### Mobile Enhancements (Better Than Web)

| Enhancement | Description |
|-------------|-------------|
| Biometric Auth | Face ID / Touch ID / Fingerprint unlock |
| Native Voice Input | iOS/Android native speech recognition |
| Push Notifications | AI execution complete, sync status |
| Haptic Feedback | Tactile response on actions |
| Share Extension | Share text/images to ExpandNote from other apps |
| Widget | Quick note widget on home screen |
| Camera Integration | Snap photo directly into note |
| Native File Picker | Pick PDFs, images from device |
| Background Sync | Sync when app backgrounded |
| Quick Actions | 3D Touch / Long press shortcuts |

---

## Implementation Phases

### Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## Phase 0: Preparation
**Goal:** Set up the worktree and validate current state
**Status:** COMPLETE ✅

### Step 0.1: Verify Current State
- [x] Run `npm run build` to ensure web app builds cleanly
- [x] Run `npm run test` to ensure all tests pass (43/43 passed)
- [x] Commit any uncommitted changes to `main`
- [x] Document current `package.json` dependencies (see below)

### Step 0.2: Create Worktree
- [x] Create branch `feature/monorepo-migration`
- [x] Set up git worktree at `../ExpandNote-monorepo`
- [x] Verify worktree is functional

### Current Dependencies (Documented 2025-01-26)

**Production Dependencies:**
| Package | Version | Category | Shareable |
|---------|---------|----------|-----------|
| @anthropic-ai/sdk | ^0.68.0 | AI | ✅ Yes |
| @supabase/ssr | ^0.7.0 | Database | Web-only |
| @supabase/supabase-js | ^2.75.1 | Database | ✅ Yes |
| html-to-text | ^9.0.5 | Utils | ✅ Yes |
| mammoth | ^1.11.0 | File parsing | Web-only |
| next | ^16.0.7 | Framework | Web-only |
| openai | ^6.8.1 | AI | ✅ Yes |
| pdf-parse | ^1.1.4 | File parsing | Web-only |
| react | 19.1.0 | Framework | ✅ Yes |
| react-dom | 19.1.0 | Framework | Web-only |
| react-hot-toast | ^2.6.0 | UI | Web-only |
| react-markdown | ^10.1.0 | UI | Web-only |
| rehype-highlight | ^7.0.2 | UI | Web-only |
| remark-gfm | ^4.0.1 | UI | Web-only |
| resend | ^6.5.2 | Email | ✅ Yes |
| zustand | ^5.0.8 | State | ✅ Yes |

**Dev Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| @eslint/eslintrc | ^3 | Linting |
| @tailwindcss/postcss | ^4 | Styling |
| @testing-library/jest-dom | ^6.9.1 | Testing |
| @testing-library/react | ^16.3.0 | Testing |
| @vitest/ui | ^4.0.13 | Testing |
| eslint | ^9 | Linting |
| eslint-config-next | ^16.0.7 | Linting |
| jsdom | ^27.2.0 | Testing |
| playwright | ^1.57.0 | E2E Testing |
| tailwindcss | ^4 | Styling |
| typescript | ^5 | Language |
| vitest | ^4.0.13 | Testing |

---

## Phase 1: Monorepo Foundation
**Goal:** Convert to Turborepo monorepo structure without breaking web app
**Status:** COMPLETE ✅

### Step 1.1: Initialize Monorepo Root
- [x] Install pnpm globally if not present (v10.26.2)
- [x] Create root `package.json` with workspaces config
- [x] Create `pnpm-workspace.yaml`
- [x] Create `turbo.json` with pipeline configuration
- [x] Create `tsconfig.base.json` for shared TypeScript settings

### Step 1.2: Relocate Web App
- [x] Create `apps/` directory
- [x] Move all web app files to `apps/web/`
- [x] Update `apps/web/package.json` name to `@expandnote/web`
- [x] Update import paths if needed
- [x] Update `apps/web/tsconfig.json` to extend base config
- [x] Verify `pnpm install` works from root
- [x] Verify `pnpm --filter @expandnote/web build` succeeds
- [x] Verify `pnpm --filter @expandnote/web test` passes (43/43 tests)

### Step 1.3: Create Shared Package
- [x] Create `packages/shared/` directory structure
- [x] Create `packages/shared/package.json` with name `@expandnote/shared`
- [x] Create `packages/shared/tsconfig.json`
- [x] Create `packages/shared/src/index.ts` entry point
- [x] Create placeholder files for types, constants, stores, utils

---

## Phase 2: Extract Shared Code
**Goal:** Move reusable code from web to shared package
**Status:** COMPLETE ✅

### Step 2.1: Extract Types
- [x] Consolidated all types into `packages/shared/src/types/index.ts`
  - User, Note, Tag, NoteTag types
  - AIProfile, AIExecution, AIProvider types
  - UserSettings, Theme, SortOption types
  - NoteVersion, CreateVersionParams, VersionListItem types
  - SyncStatus, NoteWithMetadata, SearchFilters types
  - ApiResponse, PaginatedResponse types
- [x] Web app re-exports from `@expandnote/shared/types`
- [x] Updated imports in VersionHistory and version-manager

### Step 2.2: Extract Supabase Client
- [ ] **DEFERRED** - Will extract when building mobile app
- Reason: Supabase client requires platform-specific code (SSR vs AsyncStorage)

### Step 2.3: Extract Zustand Stores
- [ ] **DEFERRED** - Will extract when building mobile app
- Reason: Stores depend on Supabase client which is platform-specific

### Step 2.4: Extract Utilities
- [x] Moved `date.ts` to `packages/shared/src/utils/`
  - formatDistanceToNow, formatDate, formatDateTime
- [x] Moved `validation.ts` to `packages/shared/src/utils/`
  - isValidEmail, validatePassword, getPasswordRequirements
- [x] Created barrel export in `packages/shared/src/utils/index.ts`
- [x] Web app re-exports from `@expandnote/shared/utils`

### Step 2.5: Extract AI Integration
- [ ] **DEFERRED** - Will extract when building mobile app
- Reason: AI calls go through API routes, mobile will use same endpoints

### Step 2.6: Extract Constants
- [x] Created `packages/shared/src/constants/index.ts` with all constants:
  - MAX_CONTENT_SIZE_BYTES, MAX_TITLE_LENGTH, MAX_TAGS_PER_NOTE
  - MAX_ATTACHMENT_SIZE_BYTES, AUTO_SAVE_DELAY_MS
  - DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
  - MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS
  - MAX_AI_EXECUTIONS_PER_MINUTE
  - SYNC_RETRY_DELAY_MS, MAX_SYNC_RETRIES
- [x] Web app re-exports from `@expandnote/shared/constants`

### Step 2.7: Verify Web App Still Works
- [x] Run `pnpm --filter @expandnote/web build` - PASSES
- [x] Run `pnpm --filter @expandnote/web test` - 43/43 tests passing

---

## Phase 3: Mobile App Setup ✅ COMPLETED
**Goal:** Create React Native (Expo) app with basic navigation

### Step 3.1: Initialize Expo App ✅
- [x] Run `npx create-expo-app apps/mobile --template tabs`
- [x] Update `apps/mobile/package.json` name to `@expandnote/mobile`
- [x] Add `@expandnote/shared` as dependency
- [x] Configure Metro bundler for monorepo (`metro.config.js`)
- [x] Verify TypeScript passes

### Step 3.2: Configure Expo ✅
- [x] Update `app.json` with ExpandNote branding
  - App name, slug, icon, splash screen
  - iOS bundle identifier: `com.expandnote.app`
  - Android package: `com.expandnote.app`
- [x] Configure Expo Router for file-based routing
- [x] Add Supabase configuration to app.json extra

### Step 3.3: Set Up Navigation Structure ✅
- [x] Create `app/(auth)/` group for login/signup
  - [x] `app/(auth)/_layout.tsx`
  - [x] `app/(auth)/login.tsx`
  - [x] `app/(auth)/signup.tsx`
- [x] Create `app/(app)/` group for authenticated screens
  - [x] `app/(app)/_layout.tsx` - App layout with stack
  - [x] `app/(app)/(tabs)/_layout.tsx` - Bottom tab navigation
    - [x] `app/(app)/(tabs)/index.tsx` - Notes list
    - [x] `app/(app)/(tabs)/search.tsx` - Search
    - [x] `app/(app)/(tabs)/profiles.tsx` - AI Profiles
    - [x] `app/(app)/(tabs)/settings.tsx` - Settings
  - [x] `app/(app)/note/[id].tsx` - Note editor
  - [x] `app/(app)/note/new.tsx` - New note screen
- [x] Create `app/_layout.tsx` root layout with AuthProvider and AuthGate
- [x] Create `app/index.tsx` entry redirect

### Step 3.4: Set Up Theming ✅
- [x] Set up dark/light mode detection using useColorScheme
- [x] Create base theme colors matching web app (`constants/Colors.ts`)
- [x] Create useTheme hook for consistent theming (`hooks/useTheme.ts`)
- [x] Applied theming to all screens (inline styles for native)

### Step 3.5: Set Up Supabase for Mobile ✅
- [x] Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage`
- [x] Install `expo-secure-store` for secure auth token storage
- [x] Create mobile-specific Supabase client (`lib/supabase.ts`)
- [x] Set up auth state persistence with SecureStore fallback to AsyncStorage
- [x] Create AuthContext and AuthProvider (`contexts/AuthContext.tsx`)

---

## Phase 4: Core Mobile Features ✅ COMPLETED
**Goal:** Implement all primary features with shared logic
**Status:** COMPLETE ✅

### Step 4.1: Authentication ✅
- [x] Create `AuthProvider` context for mobile (completed in Phase 3)
- [x] Implement login screen with email/password
- [x] Implement signup screen with validation (shared validation utils)
- [x] Add password visibility toggle (eye icon toggle)
- [x] Add "Forgot Password" flow (password reset email via Supabase)
- [x] Test auth flow end-to-end
- [x] Add biometric authentication (Face ID / Fingerprint)
  - [x] Install `expo-local-authentication`
  - [x] Add biometric login option on login screen
  - [x] Add settings toggle to enable/disable biometrics
  - [x] Require biometric verification before enabling

### Step 4.2: Notes List Screen ✅
- [x] Create `NotesList` component with FlatList
- [x] Implement pull-to-refresh (RefreshControl)
- [x] Implement infinite scroll pagination
- [x] Add note preview cards (title, excerpt, date, tags)
- [x] Add swipe actions using react-native-gesture-handler
  - [x] Swipe left: Archive/Unarchive
  - [x] Swipe right: Delete/Restore or Permanent Delete
  - [x] Visual feedback during swipe
- [x] Add floating action button for new note
- [x] Implement filter tabs (All, Favorites, Archived, Trash)
- [x] Favorite/unfavorite toggle on note cards
- [x] Delete confirmation for trash items

### Step 4.3: Note Editor Screen ✅
- [x] Create note editor with TextInput
- [x] Implement markdown preview toggle (react-native-markdown-display)
- [x] Add auto-save with shared debounce logic (AUTO_SAVE_DELAY_MS from constants)
- [x] Add title input (optional, extracted from first line if not set)
- [x] Create tag selector modal
  - [x] Show existing tags with checkboxes
  - [x] Allow creating new tag inline
  - [x] Enforce 5 tag limit with warning
- [x] Add toolbar with formatting buttons (Bold, Italic, Heading, List, Link)
- [x] Add header menu (delete, archive, favorite)
- [x] Proper keyboard handling with KeyboardAvoidingView

### Step 4.4: Search Screen ✅
- [x] Create search input with debounce (SEARCH_DEBOUNCE_MS from constants)
- [x] Implement search results list
- [x] Add tag filter chips (horizontal scrolling)
- [x] Combine search + tag filtering
- [x] Highlight search terms in results (yellow background)
- [x] Show results count
- [x] Clear filters button

### Step 4.5: Tags Management ✅
- [x] Create tags list screen at `/(app)/tags.tsx`
- [x] Implement create tag inline input
- [x] Implement edit tag (inline editing with save/cancel)
- [x] Implement delete tag with confirmation
- [x] Show tag usage count (notes per tag)
- [x] Pull-to-refresh
- [x] Empty state with call-to-action
- [x] Link from Settings > Data > Manage Tags

### Step 4.6: Settings Screen ✅
- [x] Create settings list with sections:
  - Account (email display)
  - Data (Manage Tags link)
  - Security (Biometric Login toggle, Change Password)
  - Preferences (Appearance/theme, Notifications placeholder)
  - Storage (Clear Cache)
  - Support (Help, Contact, Terms, Privacy)
- [x] Implement biometric toggle with verification
- [x] Implement theme toggle (system/light/dark) with AsyncStorage persistence
- [x] Add change password flow (sends reset email)
- [x] Sign out with confirmation

### Step 4.7: AI Profiles ✅
- [x] Create AI profiles list screen with enhanced cards
  - [x] Show profile name, model, trigger mode, output behavior
  - [x] Show associated tag for automatic profiles
  - [x] Show prompt preview (truncated)
  - [x] Toggle active/inactive with switch
- [x] Create AI profile form at `/(app)/profile/[id].tsx` (new/edit)
  - [x] Name input
  - [x] Provider selector (OpenAI, Claude, OpenRouter)
  - [x] Model selector (contextual options based on provider)
    - OpenAI: GPT-4o, GPT-4o Mini, GPT-4 Turbo
    - Claude: Claude 3.5 Sonnet/Haiku
    - OpenRouter: Llama, Mixtral, DeepSeek, Qwen, Gemma
  - [x] System prompt textarea
  - [x] User prompt template textarea
  - [x] Output behavior selector (append/replace/new_note)
  - [x] Output title template (shown for new_note behavior)
  - [x] Trigger mode selector (automatic/manual)
  - [x] Tag picker (shown for automatic trigger)
  - [x] Active toggle
- [x] Implement delete profile with confirmation
- [x] FAB for creating new profiles
- [x] useFocusEffect for refreshing list on return

**Files Created/Modified:**
- `apps/mobile/app/(auth)/login.tsx` - Password toggle, biometric login, forgot password
- `apps/mobile/app/(auth)/signup.tsx` - Password toggle, validation
- `apps/mobile/app/(app)/(tabs)/index.tsx` - Swipe gestures, filter tabs, pagination
- `apps/mobile/app/(app)/(tabs)/search.tsx` - Tag filters, highlights, debounce
- `apps/mobile/app/(app)/(tabs)/settings.tsx` - Full settings with biometrics, theme
- `apps/mobile/app/(app)/(tabs)/profiles.tsx` - Enhanced profile cards, FAB
- `apps/mobile/app/(app)/note/[id].tsx` - Markdown, tags, toolbar, auto-save
- `apps/mobile/app/(app)/tags.tsx` - Full CRUD for tags
- `apps/mobile/app/(app)/profile/[id].tsx` - Full AI profile editor
- `apps/mobile/components/notes/SwipeableNoteCard.tsx` - Swipe gesture component

---

## Phase 5: Offline Support ✅ COMPLETED
**Goal:** Implement offline-first architecture for mobile
**Status:** COMPLETE ✅

### Step 5.1: Set Up Local Database ✅
- [x] Install `expo-sqlite` and `expo-network`
- [x] Create database schema matching Supabase tables
  - notes, tags, note_tags, ai_profiles tables
  - sync_queue for pending operations
  - sync_metadata for tracking sync state
  - Proper indexes for performance
- [x] Create migration system for schema updates (schema_version table)
- [x] Implement CRUD operations for local DB (Database class)

### Step 5.2: Implement Sync Queue ✅
- [x] Create sync queue table for pending operations
- [x] Queue create/update/delete when offline
- [x] Implement sync executor when online (SyncService)
- [x] Handle conflicts with version checking (sync_version field)

### Step 5.3: Implement Background Sync ✅
- [x] Network state polling with expo-network
- [x] Auto-sync when coming back online
- [x] Sync on app foreground (AppState listener)
- [x] Show sync status indicator (SyncStatusIndicator component in header)

### Step 5.4: Conflict Resolution ✅
- [x] Detect version conflicts (server version > local version)
- [x] Implement conflict resolution UI (ConflictResolutionModal)
  - Shows both local and server versions
  - Preview of content differences
  - Choose local, server, or keep both options
- [x] Allow user to choose local or server version
- [x] Merge option creates duplicate with "(Local Copy)" suffix

**Files Created:**
- `lib/database/schema.ts` - SQLite schema definitions
- `lib/database/database.ts` - Database class with CRUD operations
- `lib/database/index.ts` - Barrel export
- `lib/sync/syncService.ts` - Sync queue processing and network detection
- `lib/sync/index.ts` - Barrel export
- `contexts/SyncContext.tsx` - React context for sync state
- `components/SyncStatusIndicator.tsx` - Status icon for header
- `components/ConflictResolutionModal.tsx` - Conflict resolution UI

**Architecture:**
- Local-first: All data stored in SQLite, synced to Supabase
- Optimistic updates: UI updates immediately, syncs in background
- Conflict detection: Uses sync_version field to detect divergence
- User control: Conflicts presented with clear options (local/server/both)

---

## Phase 6: Mobile Enhancements
**Goal:** Add native features that improve on web experience

### Step 6.1: Voice Input
- [ ] Install `expo-speech` or native speech recognition
- [ ] Add microphone button to note editor
- [ ] Implement voice-to-text transcription
- [ ] Insert transcribed text at cursor

### Step 6.2: Push Notifications
- [ ] Install `expo-notifications`
- [ ] Configure push notification permissions
- [ ] Set up Expo push notification service
- [ ] Send notification when AI execution completes
- [ ] Send notification for sync completion (optional)

### Step 6.3: Haptic Feedback
- [ ] Install `expo-haptics`
- [ ] Add haptic feedback on:
  - Note save
  - Swipe actions
  - Button presses
  - AI execution complete

### Step 6.4: Share Extension (iOS)
- [ ] Configure iOS Share Extension
- [ ] Handle shared text/images
- [ ] Create note from shared content
- [ ] Deep link to new note

### Step 6.5: Quick Actions
- [ ] Configure iOS 3D Touch actions
- [ ] Configure Android app shortcuts
- [ ] Actions: New Note, Search, Recent Note

### Step 6.6: Widget
- [ ] Install `expo-widgets` (or native module)
- [ ] Create "Quick Note" widget for home screen
- [ ] Create "Recent Notes" widget

### Step 6.7: Camera Integration
- [ ] Install `expo-camera` and `expo-image-picker`
- [ ] Add camera button to note editor
- [ ] Capture and embed image in note
- [ ] Support gallery image selection

---

## Phase 7: Polish & Testing
**Goal:** Ensure quality and performance

### Step 7.1: Performance Optimization
- [ ] Implement list virtualization (FlatList optimization)
- [ ] Add image caching
- [ ] Optimize re-renders with React.memo
- [ ] Profile and fix memory leaks
- [ ] Reduce bundle size

### Step 7.2: Error Handling
- [ ] Add global error boundary
- [ ] Implement retry logic for failed API calls
- [ ] Show user-friendly error messages
- [ ] Add crash reporting (Sentry or similar)

### Step 7.3: Accessibility
- [ ] Add accessibility labels to all buttons
- [ ] Test with screen readers (VoiceOver, TalkBack)
- [ ] Ensure proper focus management
- [ ] Support dynamic text sizes

### Step 7.4: Testing
- [ ] Set up Jest for unit tests
- [ ] Set up Detox for E2E tests
- [ ] Write tests for:
  - [ ] Authentication flow
  - [ ] Note CRUD operations
  - [ ] Tag management
  - [ ] AI profile execution
  - [ ] Offline sync
- [ ] Achieve >80% code coverage on shared package

### Step 7.5: App Store Preparation
- [ ] Design app icon (1024x1024)
- [ ] Create splash screen
- [ ] Write App Store description
- [ ] Create screenshots for all device sizes
- [ ] Prepare privacy policy URL
- [ ] Prepare terms of service URL

---

## Phase 8: Deployment
**Goal:** Ship to app stores

### Step 8.1: iOS Deployment
- [ ] Set up Apple Developer account ($99/year)
- [ ] Create App Store Connect listing
- [ ] Configure EAS Build for iOS
- [ ] Build production iOS binary
- [ ] Submit for App Store review
- [ ] Address any review feedback
- [ ] Release to App Store

### Step 8.2: Android Deployment
- [ ] Set up Google Play Console ($25 one-time)
- [ ] Create Play Store listing
- [ ] Configure EAS Build for Android
- [ ] Build production Android AAB
- [ ] Submit for Play Store review
- [ ] Address any review feedback
- [ ] Release to Play Store

### Step 8.3: Merge to Main
- [ ] Final review of all changes
- [ ] Merge `feature/monorepo-migration` to `main`
- [ ] Delete worktree
- [ ] Update CI/CD for monorepo structure
- [ ] Celebrate! 🎉

---

## Phase 9: Post-Launch
**Goal:** Iterate based on feedback

### Step 9.1: Monitoring
- [ ] Set up analytics (Mixpanel, Amplitude, or similar)
- [ ] Monitor crash reports
- [ ] Track key metrics (DAU, retention, feature usage)

### Step 9.2: Iterate
- [ ] Collect user feedback
- [ ] Prioritize feature requests
- [ ] Fix reported bugs
- [ ] Release updates regularly

---

## Technical Decisions

### Why Expo over Bare React Native?
- **Managed workflow** - No native code to maintain
- **OTA updates** - Push JS updates without app store review
- **Expo Router** - File-based routing like Next.js
- **Rich ecosystem** - Camera, notifications, auth all built-in
- **EAS Build** - Cloud builds without local Xcode/Android Studio

### Why pnpm over npm/yarn?
- **Faster** - Symlinked node_modules
- **Disk efficient** - Shared package store
- **Strict** - Prevents phantom dependencies
- **Monorepo native** - Built-in workspace support

### Why Turborepo?
- **Caching** - Never rebuild unchanged packages
- **Parallel** - Run tasks across packages concurrently
- **Simple** - Minimal config, just works

### Why NativeWind?
- **Familiar** - Same Tailwind classes as web
- **Consistent** - Easier to match web design
- **Fast** - Compiled at build time

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Monorepo breaks web app | Worktree approach, thorough testing at each step |
| Shared package complexity | Start minimal, extract only what's needed |
| Expo limitations | Research features upfront, eject if absolutely necessary |
| App store rejection | Follow guidelines, prepare for iteration |
| Sync conflicts | Implement proper conflict resolution UI |

---

## Success Criteria

- [ ] Web app works identically after monorepo migration
- [ ] Mobile app has feature parity with web
- [ ] Offline mode works reliably
- [ ] <3s cold start time on mobile
- [ ] >4.5 star rating target on app stores
- [ ] <1% crash rate

---

## Notes & Decisions Log

*(Add dated entries as implementation progresses)*

**2025-01-26:** Initial design document created. Decided on:
- Turborepo + pnpm for monorepo
- Expo with Expo Router for mobile
- Worktree approach for safe migration
- NativeWind for styling consistency

**2025-12-26:** Phase 4 (Core Mobile Features) completed. Key decisions:
- Used `expo-local-authentication` for biometric auth with SecureStore for preference persistence
- Implemented swipe gestures with `react-native-gesture-handler` using GestureHandlerRootView
- Used `react-native-markdown-display` for markdown rendering in note editor
- Leveraged shared constants from `@expandnote/shared/constants` (AUTO_SAVE_DELAY_MS, SEARCH_DEBOUNCE_MS, MAX_TAGS_PER_NOTE)
- Used inline StyleSheet for all styling (decided against NativeWind for simplicity)
- Theme preference persisted with AsyncStorage
- All screens support dark/light mode using `useColorScheme`
- AI profile editor dynamically shows model options based on selected provider
- Tags management accessible via Settings > Data > Manage Tags

**2025-12-26:** Phase 5 (Offline Support) completed. Key decisions:
- Used `expo-sqlite` for local SQLite database
- Used `expo-network` for network state detection (polling every 5s)
- Implemented sync_version field for conflict detection
- SyncService singleton handles all sync operations
- SyncContext provides React hook for sync status throughout app
- Conflict resolution UI shows both versions with clear choices
- "Keep Both" option creates duplicate with "(Local Copy)" suffix
- Sync status indicator in Notes header shows current state

---

*This document will be updated as each step is completed. Check boxes will be marked as work progresses.*
