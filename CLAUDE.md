# BookTracker — Personal Book Library

## Project Overview

BookTracker is a mobile-first PWA to manage a personal book library: track reading progress,
search and add books, organize them into Novels and Non-Fiction. Inspired by Goodreads, stripped to essentials.
Single-user with authentication. Deployed on Vercel, data in Turso (libSQL).
Repository: `frnic0las/booktracker` — License: MIT

## Tech Stack

- **Framework**: Next.js latest stable (App Router, Server Components, Server Actions, Route Handlers)
- **Language**: TypeScript (strict mode)
- **Database**: Turso (libSQL — SQLite at the edge)
- **ORM**: Drizzle ORM with `@libsql/client`
- **Auth**: Auth.js v5 (NextAuth) with credentials provider
- **External API**: Google Books API v1
- **Styling**: Tailwind CSS v4 — config in `src/app/globals.css` via `@theme` (no `tailwind.config.ts`). iOS-native aesthetic, mobile-only (375–430px)
- **Package manager**: pnpm
- **Deployment**: Vercel
- **Node**: latest LTS

## Language Rules — STRICT

- **Communication**: Claude ↔ Nicolas in **French**. Always.
- **Code**: All code, comments, variable names in **English**
- **Git**: Commit messages, PR descriptions, branch names in **English**
- **GitHub**: Issues, milestones, labels in **English**
- **App UI**: All user-facing text in **English**
- **Documentation**: All docs files in **English**
- **Claude Code prompts**: Claude AI always provides ready-to-use prompts for Nicolas to send to Claude Code

## Code Style — STRICT

- **Dependencies**: Always install the latest stable version. Never pin to a specific major version.
- **Indentation**: 2 spaces everywhere (TypeScript, JSON, CSS, SQL)
- **TypeScript**: Strict mode. No `any` types. Prefer `interface` over `type` for objects.
- **Components**: React Server Components by default. `'use client'` only when needed.
- **Styling**: Tailwind CSS utility classes only. No inline styles. No CSS Modules.
- **Architecture**: Next.js App Router conventions. Collocate related files.

## API Conventions

- Route Handlers (`src/app/api/`) for book API proxy calls (OpenLibrary, Google Books) and complex operations
- Server Actions for Turso mutations (update reading status, add to library)
- Turso client: `createClient()` from `@libsql/client` — single instance in `src/lib/db/`
- Drizzle ORM for schema definition and type-safe queries
- Google Books API key in `GOOGLE_BOOKS_API_KEY` env var — NEVER exposed to client
- All Google Books calls go through Route Handlers to protect the API key

## Database Conventions (Turso / libSQL)

- Schema defined with Drizzle ORM in `src/lib/db/schema.ts`
- Status only (reading / read / want_to_read) — no page progress tracking.
- Migrations managed by Drizzle Kit (`drizzle-kit generate` / `drizzle-kit push`)
- No RLS (not SQLite) — auth checks enforced in the proxy + every query
- Every query that touches user data MUST filter by `user_id`
- Use parameterized queries — NEVER interpolate user input into SQL
- Local dev: `turso dev --db-file local.db` or `file:local.db` via libSQL client

## Auth Conventions (Auth.js v5)

- Auth.js v5 configured in `src/lib/auth/`
- Credentials provider (email + password) — single user
- Session strategy: JWT (compatible with Vercel serverless)
- Proxy (`src/proxy.ts`) protects all `/(app)/` routes
- `auth()` helper used in Server Components and Route Handlers
- User ID from session injected into every Turso query

## Project Structure

```
booktracker/
├── .claude/
│   ├── agents/
│   │   ├── backend-dev.md
│   │   ├── frontend-dev.md
│   │   ├── ui-designer.md
│   │   ├── code-reviewer.md
│   │   ├── security-reviewer.md
│   │   └── test-writer.md
│   └── skills/
│       ├── create-component/SKILL.md
│       ├── create-route/SKILL.md
│       ├── fix-issue/SKILL.md
│       └── pr-ready/SKILL.md
├── src/
│   ├── app/
│   │   ├── (auth)/       # Login (public)
│   │   │   └── login/page.tsx
│   │   ├── (app)/        # Main app (authenticated) — shared layout + BottomNav
│   │   │   ├── layout.tsx    # App shell: scrollable content + bottom nav
│   │   │   ├── novels/       # Novels library (category = novel)
│   │   │   ├── non-fiction/  # Non-Fiction library (category = non_fiction)
│   │   │   ├── search/       # Search OpenLibrary + Google Books + add
│   │   │   └── account/      # Stats + settings
│   │   ├── api/
│   │   │   └── books/    # Library entries + OpenLibrary/Google Books search proxy
│   │   ├── layout.tsx
│   │   └── page.tsx      # Redirect to /novels
│   ├── components/
│   │   ├── ui/           # BottomNav, SearchBar, SegmentedControl, Sheet, SubTabs, EmptyState
│   │   ├── books/        # BookCard, BookDetail, BookSearch
│   │   └── library/      # LibraryPage
│   ├── hooks/            # useDebounce
│   ├── lib/
│   │   ├── db/           # Turso client, Drizzle schema, migrations
│   │   ├── auth/         # Auth.js config, providers, helpers
│   │   ├── google-books/ # Google Books client, types, helpers
│   │   ├── open-library/ # OpenLibrary client
│   │   └── utils.ts
│   ├── actions/          # Server Actions (login, add book, update status/category/rating, remove)
│   ├── types/            # Shared TypeScript interfaces
│   │   └── next-auth.d.ts
│   └── test/
│       ├── mocks/
│       │   ├── handlers.ts
│       │   └── server.ts
│       └── setup.ts
├── docs/
│   └── mockups/          # Per-issue mockups + component mapping
├── drizzle/              # Generated migrations
├── scripts/
│   └── seed.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── CLAUDE.md
├── LICENSE
├── README.md
├── .gitignore
├── .env.local.example
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Environment Variables

Two env files, both gitignored:
- `.env.local` — local development
- `.env.local.prod` — production deploy (used by `push-prod.sh`)

Copy `.env.local.example` to both and fill in the appropriate values.

```
# Both environments
TURSO_DATABASE_URL=             # Dev: file:local.db | Prod: libsql://...
TURSO_AUTH_TOKEN=               # Dev: (empty) | Prod: turso db tokens create
GOOGLE_BOOKS_API_KEY=           # Google Books API v1 key (server-only)
AUTH_SECRET=                    # Auth.js secret (openssl rand -base64 32)
AUTH_URL=                       # Dev: http://localhost:3000 | Prod: https://...

# Production only (.env.local.prod)
VERCEL_TOKEN=                   # Vercel deploy token
VERCEL_EMAIL=                   # Must match git config user.email
```

## Git Workflow

- Branch naming: `feature/<issue-number>-short-description`, `fix/<issue-number>-short-description`
- Commit messages: `feat(scope): description`, `fix(scope): description`, `docs(scope): description`
- Scopes: `library`, `search`, `lists`, `auth`, `ui`, `db`, `api`, `profile`
- Every change goes through a PR linked to a GitHub issue.
- Never commit directly to `main`.

## Commands

- **Dev server**: `pnpm dev`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **Typecheck**: `pnpm typecheck`
- **Tests**: `pnpm test`
- **DB generate migration**: `pnpm db:generate`
- **DB push migration**: `pnpm db:push`
- **DB studio**: `pnpm db:studio`
- **DB seed**: `pnpm db:seed`
- **Local DB**: `file:local.db` (optional server: `turso dev --db-file local.db`)
- **Deploy prod**: `./push-prod.sh` (reads `.env.local.prod`)

## Behavioral Guidelines

### Think Before Coding

- State your assumptions explicitly before implementing. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

- Touch only what you must. Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken. Match existing style.
- If you notice unrelated issues, mention them — don't fix them silently.
- Remove only imports/variables/functions that YOUR changes made unused.
- The test: every changed line should trace directly to the request.

### Goal-Driven Execution

- Transform tasks into verifiable goals with success criteria.
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- For multi-step tasks, state a brief plan with verification at each step.

### Claude Code Prompts

- When communicating with Nicolas, ALWAYS provide ready-to-use prompts to paste into Claude Code.
- Prompts must be self-contained: include context, goal, and constraints.
- Format: fenced code block with a brief French explanation before.

### Shell Working Directory

- The Bash tool's cwd persists across calls and drifts after any `cd` — later commands run wherever the last one left you.
- Use absolute paths, or `cd` to the repo root first, for any repo-wide file check.
- Never conclude a tracked file is missing from a "No such file or directory" error alone — verify with `git ls-files <path>`, which is cwd-independent.

## Workflow

- Every GitHub issue goes through the `fix-issue` skill (`.claude/skills/fix-issue/SKILL.md`).
- Every PR goes through the `pr-ready` skill (`.claude/skills/pr-ready/SKILL.md`) before pushing.
- The skills in `.claude/skills/` are the reference for scaffolding patterns — consult them whenever they apply.

## Project Rules

- NEVER add placeholder data or mock content. Only display real data from Turso/Google Books.
- NEVER skip error handling on API calls or database queries.
- NEVER expose GOOGLE_BOOKS_API_KEY or TURSO_AUTH_TOKEN to the client.
- ALWAYS check the design tokens (`@theme` block in `src/app/globals.css`) and the component mapping in the `docs/mockups/` READMEs before creating UI components.
- ALWAYS filter queries by user_id — there is no RLS safety net.
- ALWAYS search existing code patterns before implementing something new.
- ALWAYS use Server Components unless client interactivity is required.
- ALWAYS handle loading and error states in UI components.
- ALWAYS provide Claude Code prompts when discussing tasks with Nicolas.
