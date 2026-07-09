---
name: pr-ready
description: Pre-merge checklist to verify a branch is ready for PR. Runs all checks and validates conventions.
disable-model-invocation: true
---

Verify the current branch is ready for a pull request.

## 1. Run all checks

```
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Fix any failures before proceeding.

## 2. Architecture review

- [ ] Server Components used by default, `'use client'` only where needed
- [ ] No business logic in Route Handlers — extracted to `src/lib/` functions
- [ ] Turso/Drizzle queries properly typed and error-handled
- [ ] Every user data query includes `user_id` filter (no RLS safety net)
- [ ] Types defined in `src/types/`, no `any`

## 3. Security review

- [ ] No server env vars in client code (`GOOGLE_BOOKS_API_KEY`, `TURSO_AUTH_TOKEN`)
- [ ] User input validated before use
- [ ] `auth()` called before every DB operation in Route Handlers and Server Actions
- [ ] All user data queries scoped by `user_id` from session

## 4. Design system review

- [ ] UI uses the design tokens from the `@theme` block in `src/app/globals.css`
- [ ] Dark/light mode works
- [ ] Touch targets ≥ 44px
- [ ] No hardcoded colors/spacing — Tailwind tokens only
- [ ] Mobile viewport only (375–430px)

## 5. Git hygiene

- [ ] Branch named correctly: `feature/<issue>-desc` or `fix/<issue>-desc`
- [ ] Commits follow convention: `feat(scope): description`
- [ ] No unrelated changes in the diff: `git diff main --stat`
- [ ] PR description references the issue: `Closes #<number>`

## 6. Verify the push landed on remote (MANDATORY)

Do not report success until the remote branch actually matches your local HEAD.
`git push` can fail silently — piping its output through `tail`/`head`/`grep`
masks the failure because the pipe returns the last command's exit code, not
git's.

- [ ] Never pipe `git push` through `tail`/`head`/`grep` without `set -o pipefail`.
- [ ] After pushing, verify remote state directly:

  ```
  git fetch origin && git rev-parse HEAD "origin/$(git rev-parse --abbrev-ref HEAD)"
  ```

- [ ] The two SHAs must be identical. If they differ, the push failed — report
      the failure and do **not** claim success.
- [ ] Any "committed and pushed" report must include the remote SHA as proof.
