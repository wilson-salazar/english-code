# English Code

English Code is an interactive English-learning application for developers, QA engineers, and other technology professionals. It teaches practical vocabulary and communication through realistic scenarios such as standups, bug reports, code reviews, incidents, and technical interviews.

## Features

- Email and password authentication with password recovery.
- Learning programs from A2 to C1.
- Reading, listening, comprehension, speaking, and writing activities.
- Dialogue audio using ElevenLabs voices (Adam and Jessa).
- AI feedback for written and spoken answers using Anthropic.
- Progress tracking per user and per level.
- Local Supabase stack with PostgreSQL, Auth, Studio, migrations, seed data, and Mailpit.

## Requirements

- Node.js 20 or newer.
- npm.
- Docker Desktop running.
- Git.
- An Anthropic API key for AI evaluations (optional for basic navigation).
- An ElevenLabs API key for generated audio (optional for basic navigation).

## Local installation

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/wilson-salazar/english-code.git
   cd english-code
   npm install
   ```

2. Start local Supabase:

   ```bash
   npm run db:start
   npm run db:reset
   npx supabase status
   ```

3. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

4. From the output of `npx supabase status`, copy:

   - `API_URL` into `NEXT_PUBLIC_SUPABASE_URL`.
   - `PUBLISHABLE_KEY` into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

5. If you want audio and AI evaluation, add your own ElevenLabs and Anthropic keys to `.env.local`.

6. Start the application:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

Local services:

- Supabase Studio: [http://127.0.0.1:54323](http://127.0.0.1:54323)
- Mailpit: [http://127.0.0.1:54324](http://127.0.0.1:54324)
- Supabase API: `http://127.0.0.1:54321`

Password recovery emails are captured by Mailpit during local development. They are not delivered to a real inbox unless an SMTP provider is configured.

## Environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key | Yes |
| `ANTHROPIC_API_KEY` | Written and spoken answer evaluation | For AI feedback |
| `ELEVENLABS_API_KEY` | Adam and Jessa text-to-speech audio | For generated audio |

Never commit `.env.local` or real API keys. The repository only includes `.env.example` with placeholders.

## Useful commands

```bash
npm run dev       # Start Next.js in development mode
npm run build     # Create a production build
npm run lint      # Run ESLint
npm run db:start  # Start local Supabase
npm run db:stop   # Stop local Supabase
npm run db:reset  # Rebuild and seed the local database
```

## Install with an AI assistant

If you prefer guided installation, copy the prompt from [AI_SETUP_PROMPT.md](./AI_SETUP_PROMPT.md) and give it to your coding assistant after cloning the repository.

## Data and security

- Database migrations are stored in `supabase/migrations`.
- Lesson content is loaded from the Supabase seed files.
- Row Level Security restricts private user data to its owner.
- Local Supabase credentials are development credentials and must not be reused in production.

## Technology

Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase, Anthropic, and ElevenLabs.
