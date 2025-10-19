# ExpandNote

AI-powered note-taking application designed to replace Simplenote with enhanced AI capabilities.

## Features

- **Voice to Text**: Create notes using voice input powered by OpenAI Whisper
- **AI Profiles**: Automate content processing with custom AI prompts triggered by tags
- **Smart Tagging**: AI-powered tag suggestions based on note content
- **Offline First**: Work seamlessly offline with automatic sync across devices
- **Markdown Support**: Rich text formatting with live preview
- **Real-time Sync**: Cross-device synchronization via Supabase

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Mobile**: Capacitor (iOS/Android)
- **AI Services**: OpenAI (Whisper, GPT), Anthropic Claude

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/altitudeinfosys/ExpandNote.git
cd ExpandNote
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npm run type-check
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utility libraries and configurations
│   └── supabase/    # Supabase client setup
├── stores/          # Zustand state stores
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
└── utils/           # Helper functions

supabase/
└── migrations/      # Database migration files
```

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the complete database schema including:
- Users and authentication
- Notes with full-text search
- Tags and note-tag relationships
- AI Profiles for automation
- AI execution logs
- User settings
- Note version history for conflict resolution

## Development Roadmap

### Phase 1: MVP (Current)
- [x] Project setup
- [x] Database schema
- [x] Type definitions
- [x] State management
- [ ] Authentication UI
- [ ] Note CRUD operations
- [ ] Basic tagging
- [ ] Search functionality
- [ ] Offline sync

### Phase 2: Mobile & Voice
- [ ] Capacitor integration
- [ ] Voice transcription
- [ ] Mobile UI optimization
- [ ] App store deployment

### Phase 3: AI Integration
- [ ] AI Profile system
- [ ] Auto-tagging
- [ ] OpenAI & Claude integration
- [ ] Execution logging

### Phase 4: Sharing & Polish
- [ ] Email sharing
- [ ] Conflict resolution UI
- [ ] Advanced search
- [ ] Performance optimization

## Documentation

- [Product Requirements Document](./ExpandNote.prd) - Complete product specifications
- [Developer Guide](./CLAUDE.md) - Architecture and development guidelines

## Contributing

This project is currently in active development. Contributions will be welcome once the MVP is complete.

## License

[License to be determined]

## Support

For issues and questions, please open an issue on GitHub.
