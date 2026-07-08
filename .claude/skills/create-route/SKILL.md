---
name: create-route
description: Scaffold a new Route Handler or Server Action with types, validation, and tests.
disable-model-invocation: true
---

Create a new API route or Server Action for: $ARGUMENTS

## If Route Handler (GET/proxy endpoint):

1. Identify the resource and HTTP methods needed
2. Create or update TypeScript interfaces in `src/types/<resource>.ts`
3. Create the Route Handler in `src/app/api/<resource>/route.ts`:
   - Import `auth` from `src/lib/auth/` — check session before any DB access
   - Validate query params or request body
   - Return typed JSON with `NextResponse.json()`
   - Handle errors with appropriate HTTP status codes
4. If it calls Google Books: use `src/lib/google-books/client.ts`, cache the response in Turso
5. ALWAYS scope queries with `user_id` from session (no RLS safety net)
6. Write tests in `src/app/api/<resource>/route.test.ts`
7. Run checks:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`

## If Server Action (mutation):

1. Create or update the action file in `src/actions/<resource>.ts`
2. Add `'use server'` directive at the top
3. Get session via `auth()` — reject if unauthenticated
4. Validate inputs
5. Use Drizzle ORM for Turso queries — ALWAYS filter by `user_id`
6. Call `revalidatePath()` after mutations
7. Return typed result (not void — the client needs feedback)
8. Write tests
9. Run checks:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
