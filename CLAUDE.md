# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpandNote is an AI-powered note-taking application designed to replace Simplenote with enhanced AI capabilities. The app supports voice-to-text note creation, AI Profiles for automated content processing, and full offline-first architecture with real-time sync.

**Tech Stack:**
- Frontend: Next.js 14+ (App Router)
- Mobile: Capacitor (iOS/Android wrapper)
- Backend: Supabase (PostgreSQL, Auth, Real-time)
- Hosting: Vercel (web), App stores (mobile)
- AI Services: OpenAI (Whisper, GPT), Anthropic Claude

## Project Architecture

### Core Architecture Pattern
The application follows an offline-first architecture with:
1. Local storage (IndexedDB for web, SQLite for mobile via Capacitor)
2. Background sync engine with Supabase
3. Real-time subscriptions for cross-device sync
4. Last-write-wins conflict resolution with version history

### Key Components
- **Notes System**: Markdown-based notes with title, content, tags, timestamps
- **Tagging System**: Flat hierarchy with max 5 tags per note, AI-powered auto-suggestions
- **AI Profiles**: User-configured automation rules that execute AI prompts when specific tags are applied
- **Sync Engine**: Bidirectional sync with conflict detection and resolution
- **Voice Input**: OpenAI Whisper API integration for voice-to-text

## Development Commands

### Initial Setup
```bash
# Initialize Next.js project (when ready to start)
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# Setup Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Setup Capacitor for mobile
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/ios @capacitor/android
npm install @capacitor/filesystem @capacitor/network @capacitor/haptics
npm install @capacitor-community/sqlite @capacitor/voice-recorder

# State management
npm install zustand  # or jotai

# Markdown editor
npm install react-markdown react-simplemde-editor simplemde

# Development dependencies
npm install -D @types/node @types/react @types/react-dom
```

### Build and Development
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Build mobile apps
npx cap sync
npx cap open ios
npx cap open android
```

### Testing
```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

## Database Schema

All tables use UUID primary keys and have Row Level Security (RLS) enabled:

- `users`: User authentication and profile
- `notes`: Note content with title, body (markdown), timestamps, soft delete
- `tags`: User-created tags with unique constraint per user
- `note_tags`: Many-to-many relationship between notes and tags
- `ai_profiles`: AI automation rules linked to tags
- `ai_executions`: Execution logs for AI profiles (tracking tokens, errors)
- `user_settings`: User preferences and encrypted API keys
- `note_versions`: Version history for conflict resolution (last 5 versions)

**Important Constraints:**
- Notes: Max 1MB content size
- Tags: Max 5 per note
- AI Profiles: One profile per tag per user

## AI Profile System

AI Profiles are the core differentiator. Each profile contains:
- Associated tag trigger (e.g., #youtube)
- AI provider (OpenAI or Claude) and model selection
- System prompt and user prompt template with variables: `{note_title}`, `{note_content}`, `{tags}`
- Trigger mode: Automatic (on tag add) or Manual (button click)
- Output behavior: Append to note, create new note, or replace content

When a note is tagged, the system checks for matching AI Profiles and executes them according to their configuration.

## Sync Strategy

### Offline-First Approach
1. All CRUD operations work locally first
2. Changes queued for sync when network available
3. Sync triggered on: note save (debounced 2s), tag change, app foreground, manual sync

### Conflict Resolution
- Last-write-wins (LWW) based on timestamp comparison
- Conflicts flagged in UI with manual resolution option
- Previous versions accessible (last 5 versions stored)

## Development Phases

The project is planned in 5 phases:

**Phase 1 (MVP - Current)**: Authentication, CRUD notes, markdown editor, basic tagging, search, offline sync, web deployment

**Phase 2**: Capacitor mobile builds, voice transcription, mobile UI

**Phase 3**: AI Profile system, auto-tagging, AI provider integration

**Phase 4**: Email sharing, conflict resolution UI, advanced search

**Phase 5**: Post-launch enhancements (OAuth, public sharing, rich media)

## Security Considerations

- All user API keys encrypted at rest (AES-256)
- Supabase RLS enforced on all tables (users can only access their own data)
- HTTPS only for all connections
- No AI training on user data (OpenAI/Claude zero retention)
- GDPR-compliant data deletion on account removal

## Performance Requirements

- Note list load: <500ms
- Single note load: <200ms
- Search results: <100ms (requires indexing)
- Sync operation: <2s for 100 notes
- Support 10,000+ notes per user
- Handle 100+ tags per user

## Open Questions

1. Markdown editor: Use react-markdown + react-simplemde-editor or build custom?
2. Mobile voice recording: Native Capacitor plugin vs. web Audio API?
3. Offline storage size limits: Implement quota management for IndexedDB?
4. AI streaming: Stream responses in real-time or wait for completion?
5. Tag autocomplete: Existing tags only or allow free-form with fuzzy matching?
6. Export format: JSON, Markdown files, or both?
7. Rate limiting: Implement limits on AI executions to prevent API abuse?

## Reference Documentation

Full product requirements are documented in `ExpandNote.prd` including:
- Complete data schema with SQL definitions
- API endpoint specifications
- UI mockups and interaction flows
- Success metrics and risk mitigation strategies
- setup the app for local testing to start at port 3003
- whenever you finish a request and is ready to be tested and reviewed on my end - please restart the local web server at port 3003
- always npm run build after each request to ensure that there is no build error