---
name: create-component
description: Scaffold a new React component following the design system and project conventions.
disable-model-invocation: true
---

Create a new React component for: $ARGUMENTS

1. Read `docs/DESIGN_SYSTEM.md` to understand the visual conventions
2. Determine if this is a page component (`src/app/`) or a reusable component (`src/components/`)
3. Check existing components for similar patterns: `ls src/components/`
4. Create the component file in PascalCase: `<ComponentName>.tsx`
5. Follow these conventions:
   - Tailwind CSS utility classes only — no inline styles, no CSS Modules
   - Use design system tokens from `tailwind.config.ts` — never hardcode colors or spacing
   - TypeScript strict: define props interface, no `any` types
   - Server Component by default — add `'use client'` only if hooks or event handlers are needed
   - Include loading state, error state, and empty state handling
   - Use Server Actions (`src/actions/`) for mutations, not direct Turso calls from components
   - Use `next/image` for images (book covers), `next/link` for navigation
6. Place the component in the correct directory:
   - `src/components/ui/` for generic UI (Button, Modal, Sheet, SearchBar)
   - `src/components/books/` for book-specific components
   - `src/components/library/` for library/list-specific components
7. If the component needs data:
   - Server Component: fetch directly with Drizzle ORM via `src/lib/db/`
   - Client Component: receive data via props from a parent Server Component
   - ALWAYS include `user_id` filter when querying user data (no RLS)
8. Ensure touch targets are ≥ 44px for interactive elements
9. Verify dark/light mode works via `prefers-color-scheme`
10. Run checks:
    - `pnpm typecheck`
    - `pnpm lint`
