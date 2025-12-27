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

### Step 2.1: Extract Types
- [ ] Move `src/types/supabase.ts` to `packages/shared/src/types/`
- [ ] Move `src/types/notes.ts` to `packages/shared/src/types/`
- [ ] Move `src/types/tags.ts` to `packages/shared/src/types/`
- [ ] Move `src/types/ai-profiles.ts` to `packages/shared/src/types/`
- [ ] Move `src/types/settings.ts` to `packages/shared/src/types/`
- [ ] Create `packages/shared/src/types/index.ts` barrel export
- [ ] Update web app imports to use `@expandnote/shared/types`

### Step 2.2: Extract Supabase Client
- [ ] Create `packages/shared/src/supabase/client.ts` (base client factory)
- [ ] Keep web-specific SSR client in `apps/web/src/lib/supabase/`
- [ ] Extract query helpers (notes, tags, profiles) to shared
- [ ] Update web app to use shared queries
- [ ] Test all Supabase operations still work

### Step 2.3: Extract Zustand Stores
- [ ] Move `src/stores/notesStore.ts` to `packages/shared/src/stores/`
- [ ] Move `src/stores/tagsStore.ts` to `packages/shared/src/stores/`
- [ ] Create store factory pattern (inject Supabase client)
- [ ] Update web app to use shared stores
- [ ] Test store operations

### Step 2.4: Extract Utilities
- [ ] Move `src/lib/utils/date.ts` to `packages/shared/src/utils/`
- [ ] Move `src/lib/utils/validation.ts` to `packages/shared/src/utils/`
- [ ] Move `src/lib/utils/sanitize.ts` to `packages/shared/src/utils/`
- [ ] Create `packages/shared/src/utils/index.ts` barrel export
- [ ] Update web app imports

### Step 2.5: Extract AI Integration
- [ ] Move `src/lib/ai/types.ts` to `packages/shared/src/ai/`
- [ ] Move `src/lib/ai/prompt-template.ts` to `packages/shared/src/ai/`
- [ ] Move `src/lib/ai/models.ts` to `packages/shared/src/ai/`
- [ ] Keep API route handlers in web app
- [ ] Update web app imports

### Step 2.6: Extract Constants
- [ ] Create `packages/shared/src/constants/limits.ts`
  - MAX_TAGS_PER_NOTE = 5
  - MAX_CONTENT_SIZE = 1MB
  - MAX_TITLE_LENGTH = 500
  - AUTO_SAVE_DELAY_MS = 2000
  - SEARCH_DEBOUNCE_MS = 300
- [ ] Create `packages/shared/src/constants/index.ts`
- [ ] Update web app to use shared constants

### Step 2.7: Verify Web App Still Works
- [ ] Run `pnpm --filter @expandnote/web build`
- [ ] Run `pnpm --filter @expandnote/web test`
- [ ] Manual smoke test of all features:
  - [ ] Create/edit/delete note
  - [ ] Add/remove tags
  - [ ] Search notes
  - [ ] Toggle favorite/archive
  - [ ] AI profile execution
  - [ ] Settings changes
  - [ ] Auth flow

---

## Phase 3: Mobile App Setup
**Goal:** Create React Native (Expo) app with basic navigation

### Step 3.1: Initialize Expo App
- [ ] Run `npx create-expo-app apps/mobile --template tabs`
- [ ] Update `apps/mobile/package.json` name to `@expandnote/mobile`
- [ ] Add `@expandnote/shared` as dependency
- [ ] Configure Metro bundler for monorepo
- [ ] Verify `pnpm --filter @expandnote/mobile start` launches

### Step 3.2: Configure Expo
- [ ] Update `app.json` with ExpandNote branding
  - App name, slug, icon, splash screen
  - iOS bundle identifier: `com.expandnote.app`
  - Android package: `com.expandnote.app`
- [ ] Configure Expo Router for file-based routing
- [ ] Set up EAS Build configuration (`eas.json`)

### Step 3.3: Set Up Navigation Structure
- [ ] Create `app/(auth)/` group for login/signup
  - [ ] `app/(auth)/login.tsx`
  - [ ] `app/(auth)/signup.tsx`
- [ ] Create `app/(app)/` group for authenticated screens
  - [ ] `app/(app)/(tabs)/` for bottom tab navigation
    - [ ] `app/(app)/(tabs)/notes.tsx` - Notes list
    - [ ] `app/(app)/(tabs)/search.tsx` - Search
    - [ ] `app/(app)/(tabs)/settings.tsx` - Settings
  - [ ] `app/(app)/note/[id].tsx` - Note editor
  - [ ] `app/(app)/settings/` - Settings sub-screens
- [ ] Create `app/_layout.tsx` root layout
- [ ] Create `app/index.tsx` entry redirect

### Step 3.4: Set Up Theming
- [ ] Install `nativewind` for Tailwind-like styling
- [ ] Configure `tailwind.config.js` for mobile
- [ ] Set up dark/light mode detection
- [ ] Create base theme colors matching web app

### Step 3.5: Set Up Supabase for Mobile
- [ ] Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage`
- [ ] Create mobile-specific Supabase client with AsyncStorage
- [ ] Set up auth state persistence
- [ ] Test connection to Supabase

---

## Phase 4: Core Mobile Features
**Goal:** Implement all primary features with shared logic

### Step 4.1: Authentication
- [ ] Create `AuthProvider` context for mobile
- [ ] Implement login screen with email/password
- [ ] Implement signup screen with validation
- [ ] Add password visibility toggle
- [ ] Add "Forgot Password" flow
- [ ] Test auth flow end-to-end
- [ ] Add biometric authentication (Face ID / Fingerprint)
  - [ ] Install `expo-local-authentication`
  - [ ] Add biometric prompt on app launch
  - [ ] Add settings toggle to enable/disable

### Step 4.2: Notes List Screen
- [ ] Create `NotesList` component with FlatList
- [ ] Implement pull-to-refresh
- [ ] Implement infinite scroll pagination
- [ ] Add note preview cards (title, excerpt, date)
- [ ] Add swipe actions (delete, favorite, archive)
- [ ] Add floating action button for new note
- [ ] Implement filter tabs (All, Favorites, Archived, Trash)
- [ ] Connect to shared Zustand store

### Step 4.3: Note Editor Screen
- [ ] Create note editor with TextInput
- [ ] Implement markdown preview toggle
- [ ] Add auto-save with shared debounce logic
- [ ] Add title input (optional)
- [ ] Create tag selector bottom sheet
  - [ ] Show existing tags with checkboxes
  - [ ] Allow creating new tag inline
  - [ ] Enforce 5 tag limit
- [ ] Add toolbar with formatting buttons
- [ ] Add "More" menu (delete, archive, favorite, version history)
- [ ] Implement version history viewer
  - [ ] Fetch versions from API
  - [ ] Show diff or full content
  - [ ] Allow restore

### Step 4.4: Search Screen
- [ ] Create search input with debounce
- [ ] Implement search results list
- [ ] Add recent searches (local storage)
- [ ] Add tag filter chips
- [ ] Combine search + tag filtering
- [ ] Highlight search terms in results

### Step 4.5: Tags Management
- [ ] Create tags list screen (settings sub-screen)
- [ ] Implement create tag modal
- [ ] Implement edit tag (rename)
- [ ] Implement delete tag with confirmation
- [ ] Show tag usage count

### Step 4.6: Settings Screen
- [ ] Create settings list with sections:
  - Account (email, sign out)
  - AI Configuration (API keys)
  - AI Profiles (list/manage)
  - Tags (manage)
  - Email-to-Note (setup)
  - Appearance (theme toggle)
  - About (version, links)
- [ ] Implement secure API key input (masked)
- [ ] Implement theme toggle (system/light/dark)

### Step 4.7: AI Profiles
- [ ] Create AI profiles list screen
- [ ] Create AI profile form (new/edit)
  - [ ] Name input
  - [ ] Provider selector (OpenAI, Claude, OpenRouter)
  - [ ] Model selector (dynamic based on provider)
  - [ ] System prompt textarea
  - [ ] User prompt template textarea
  - [ ] Trigger mode selector (automatic/manual)
  - [ ] Output behavior selector (append/replace/new note)
  - [ ] Output title template (if new note)
  - [ ] Active toggle
- [ ] Implement delete profile with confirmation
- [ ] Add "Execute on Note" action in note editor
- [ ] Show execution progress indicator
- [ ] Display AI execution logs

---

## Phase 5: Offline Support
**Goal:** Implement offline-first architecture for mobile

### Step 5.1: Set Up Local Database
- [ ] Install `expo-sqlite`
- [ ] Create database schema matching Supabase tables
- [ ] Create migration system for schema updates
- [ ] Implement CRUD operations for local DB

### Step 5.2: Implement Sync Queue
- [ ] Create sync queue table for pending operations
- [ ] Queue create/update/delete when offline
- [ ] Implement sync executor when online
- [ ] Handle conflicts with version checking

### Step 5.3: Implement Background Sync
- [ ] Install `expo-background-fetch`
- [ ] Configure periodic background sync
- [ ] Sync on app foreground
- [ ] Show sync status indicator

### Step 5.4: Conflict Resolution
- [ ] Detect version conflicts
- [ ] Implement conflict resolution UI
- [ ] Allow user to choose local or server version
- [ ] Or implement automatic merge strategy

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

---

*This document will be updated as each step is completed. Check boxes will be marked as work progresses.*
