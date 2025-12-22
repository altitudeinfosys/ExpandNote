# CLAUDE.md

## Project Overview

ExpandNote is an AI-powered note-taking app with voice-to-text, AI Profiles for automated content processing, and email-to-note functionality.

**Tech Stack:** Next.js 14+ (App Router), Supabase (PostgreSQL, Auth, RLS), Capacitor (mobile), Vercel

## Key Commands

```bash
PORT=3003 npm run dev   # Development server (always use port 3003)
npm run build           # Build - run after every change
npm run test            # Run tests
```

## Database (Supabase)

Key tables with RLS enabled: `notes`, `tags`, `note_tags`, `ai_profiles`, `ai_executions`, `user_settings`

AI Profiles link to tags and execute prompts with variables: `{note_title}`, `{note_content}`, `{tags}`

## Implemented Features

- Notes CRUD with markdown editor
- Tagging system (max 5 per note)
- AI Profiles: trigger on tag, supports OpenAI/Claude/OpenRouter, output modes (append/replace/new note)
- Voice input via OpenAI Whisper
- Email-to-note with Resend (attachments: PDF, Word, images)
- Real-time sync with offline-first architecture
- Modern landing page with theme support

## Developer Preferences

1. **Use todo list before coding**
2. **Double-check extreme changes** - ask before proceeding with anything that could endanger stability
3. **Restart server at port 3003** after completing work for testing
4. **Run `npm run build`** after each change to catch errors
