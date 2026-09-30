# BookTracker

BookTracker is a mobile-first Progressive Web App for managing a personal book library. It is
single-user and self-hosted: there is no hosted offering, so anyone who wants to use it deploys
their own instance on Vercel with their own Turso database and API keys. The interface follows an
iOS-native aesthetic and targets phone viewports (375–430px).

- Two separate libraries: **Novels** and **Non-Fiction**
- Reading status per book: *Want to Read*, *Reading*, *Read*, plus an *Abandoned* flag
- Simple rating: good / average / bad
- Book search across **OpenLibrary** and **Google Books**, queried in parallel and grouped by source
- Search filters by language and author
- Add books by ISBN, typed manually or scanned from the barcode with the camera
- Account page with reading stats (books per status, pages read)
- Installable PWA with app icons and iOS splash screens, light and dark mode

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Components, Server Actions, Route Handlers)
- TypeScript (strict mode)
- [Turso](https://turso.tech) (libSQL / SQLite) with [Drizzle ORM](https://orm.drizzle.team)
- [Auth.js v5](https://authjs.dev) with a credentials provider and JWT sessions
- [Tailwind CSS v4](https://tailwindcss.com)
- OpenLibrary and Google Books API v1
- Vitest, Testing Library and MSW for tests
- pnpm, deployed on Vercel

## Getting Started

Prerequisites: Node.js (LTS) and pnpm. The [Turso CLI](https://docs.turso.tech/cli/introduction)
is optional locally.

```bash
# 1. Clone and install
git clone https://github.com/frnic0las/booktracker.git
cd booktracker
pnpm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local:
#   TURSO_DATABASE_URL=file:local.db           (local SQLite file)
#   TURSO_AUTH_TOKEN=                          (leave empty locally)
#   GOOGLE_BOOKS_API_KEY=<your key>            (see below)
#   AUTH_SECRET=<output of: openssl rand -base64 32>
#   AUTH_URL=http://localhost:3000

# 3. Apply migrations (creates local.db)
# drizzle-kit does not load .env.local by itself, so pass the URL explicitly:
TURSO_DATABASE_URL=file:local.db pnpm db:push

# 4. Create the local user
# Defaults to test@booktracker.app / booktracker unless SEED_USER_EMAIL and
# SEED_USER_PASSWORD are set in .env.local. These defaults are for local
# development only; never use them in production.
pnpm db:seed

# 5. Run the app on http://localhost:3000
pnpm dev
```

With `file:local.db`, the libSQL client reads and writes the SQLite file directly, so no database
server is needed. Optionally, `turso dev --db-file local.db` serves the same file over HTTP on
`http://127.0.0.1:8080`; use that URL for `TURSO_DATABASE_URL` (and for `pnpm db:push`) while it
runs.

**Google Books API key**: in the [Google Cloud Console](https://console.cloud.google.com/), create
(or select) a project, enable the **Books API** under *APIs & Services → Library*, then create an
API key under *APIs & Services → Credentials*. The key is only ever used server-side. OpenLibrary
requires no key.

Other useful scripts: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
`pnpm db:generate` (generate a migration after editing the schema) and `pnpm db:studio`.

## Deployment

1. **Create a Turso database and token**

   ```bash
   turso db create <db-name>
   turso db show <db-name> --url       # libsql://<db-name>-<org>.turso.io
   turso db tokens create <db-name>
   ```

2. **Create a Vercel project** from the repository (or with `vercel link`) and set these
   environment variables for the Production environment:

   | Variable | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | `libsql://<db-name>-<org>.turso.io` |
   | `TURSO_AUTH_TOKEN` | the token created above |
   | `GOOGLE_BOOKS_API_KEY` | your Google Books API key |
   | `AUTH_SECRET` | a new secret from `openssl rand -base64 32` |
   | `AUTH_URL` | optional: `https://<your-app>.vercel.app` (the app sets `trustHost`, so Auth.js uses the forwarded host) |

3. **Push the migrations** to the production database:

   ```bash
   TURSO_DATABASE_URL=libsql://<db-name>-<org>.turso.io \
   TURSO_AUTH_TOKEN=<token> \
   pnpm db:push
   ```

4. **Seed the production user** with real credentials. Always set both variables: without them the
   script falls back to the local development defaults.

   ```bash
   TURSO_DATABASE_URL=libsql://<db-name>-<org>.turso.io \
   TURSO_AUTH_TOKEN=<token> \
   SEED_USER_EMAIL=you@example.com \
   SEED_USER_PASSWORD='<a strong password>' \
   pnpm db:seed
   ```

   Variables set in the shell take precedence over `.env.local`, which the seed script also loads.

### `push-prod.sh`

Once the Vercel project is linked, [`push-prod.sh`](push-prod.sh) automates later deploys. It reads
`.env.local.prod` (copy `.env.local.example` and fill in production values, plus `VERCEL_TOKEN` and
`VERCEL_EMAIL`), then:

- checks that you are on a clean, up-to-date `main` and that `git config user.email` matches
  `VERCEL_EMAIL`
- runs `pnpm lint`, `pnpm typecheck` and `pnpm build`
- pushes migrations with `pnpm db:push`
- deploys with `vercel --prod` using the Vercel CLI

Both `.env.local` and `.env.local.prod` are gitignored.

## Architecture

- **App Router**: authenticated pages live in the `src/app/(app)/` route group (Novels,
  Non-Fiction, Search, Account, book detail) and share a layout with a bottom tab bar. The login
  page lives in `src/app/(auth)/`. Pages are Server Components by default; `'use client'` is used
  only for interactive pieces such as search, sheets and the barcode scanner.
- **Server Actions** (`src/actions/`) handle every mutation: login, adding a book, updating its
  status, category or rating, marking it abandoned and removing it.
- **Route Handlers** (`src/app/api/`) serve reads: the user's library, a single entry, stats, and
  `/api/books/search`, which proxies OpenLibrary and Google Books in parallel and merges the
  results. External book APIs are only called from the server, so `GOOGLE_BOOKS_API_KEY` never
  reaches the browser.
- **Auth.js credentials**: email and password, checked against a bcrypt hash in the `users` table,
  with JWT sessions suited to Vercel's serverless runtime. `src/proxy.ts` redirects
  unauthenticated requests to `/login`, and every data Route Handler and Server Action resolves the user
  ID from the session again before touching the database.
- **`user_id` scoping**: SQLite has no row-level security, so there is no database-level safety
  net. Every query on user data filters by the `user_id` taken from the session, including
  updates and deletes (`WHERE id = ? AND user_id = ?`), so one user can never read or modify
  another user's rows. All queries go through Drizzle and are parameterized.
- **Data model** (`src/lib/db/schema.ts`): `books` holds shared book metadata; `user_books` links a
  user to a book with its status, category, rating and dates. Migrations are generated by Drizzle
  Kit into `drizzle/`.

## How It Was Built

BookTracker was built with a multi-agent [Claude Code](https://www.anthropic.com/claude-code)
workflow, driven entirely by GitHub issues.

- **Agents** live in [`.claude/agents/`](.claude/agents/): `backend-dev`, `frontend-dev`,
  `ui-designer`, `test-writer`, `code-reviewer` and `security-reviewer`, each with its own scope
  and tool set.
- **Skills** live in [`.claude/skills/`](.claude/skills/): `fix-issue` (end-to-end issue handling),
  `pr-ready` (pre-PR checklist), `create-component` and `create-route` (scaffolding patterns).
- **Routing**: each issue carries an `agent-*` label (`agent-backend`, `agent-designer`,
  `agent-frontend`) that tells `fix-issue` which agent handles it. A feature is split into issues
  sequenced **backend → designer → frontend**: the API and data layer first, then the design, then
  the UI built on both.
- **Design handoff**: the designer agent produces mockups and a component mapping in
  [`docs/mockups/`](docs/mockups/), one folder per issue, which the frontend agent implements.
- **Review**: every change goes through a pull request linked to its issue, and every PR is
  reviewed before merge.

Project conventions for the agents are documented in [`CLAUDE.md`](CLAUDE.md).

## Design System

- Design tokens (colors for surfaces, text, accent and reading statuses, in dark and light
  variants) are defined as CSS variables and exposed to Tailwind through the `@theme` block in
  [`src/app/globals.css`](src/app/globals.css). There is no `tailwind.config.ts`.
- Per-issue mockups and component mappings (Tailwind classes for each component) live in
  [`docs/mockups/`](docs/mockups/).

## License

[MIT](LICENSE)
