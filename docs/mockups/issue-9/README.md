# Issue #9 — Search, book detail & account pages (mockups)

Design brief for the **search / add flow**, the **book detail page**, and the
**account page**. Continues the visual language established in issue #8
(`docs/mockups/issue-8/`) — same tokens, same iOS-native dark theme. Nothing new
is added to the palette here; only new components are introduced.

> **Folder note:** the issue body references `docs/mockups/issue-4/`, but that is a
> typo (issue #4 was the middleware→proxy migration). Per the `fix-issue` skill and
> the `ui-designer` agent, all artifacts for this issue live in `docs/mockups/issue-9/`.

Open `mockup.html` in a browser. It contains five boards, all at a 390px viewport:

1. **Search — results** (query typed, populated list)
2. **Search — no results** (also stands in for the initial "type to search" prompt)
3. **Add book — sheet** (bottom sheet over dimmed results: category + status pickers)
4. **Book detail** (hero cover, badges, metadata, description, remove)
5. **Account** (greeting, stats, logout)

---

## Design language

All tokens are inherited verbatim from issue #8 — see that README for the full
`@theme` table. No new colors, radii, or type sizes are introduced. Reused tokens:

| Token | Where it appears in this issue |
| ----- | ------------------------------ |
| `--color-surface-1` | Search field, meta row, stat cards, add-sheet body |
| `--color-surface-2` | Segmented picker track, thumbnails |
| `--color-separator` | Row hairlines, card borders, meta-cell dividers |
| `--color-accent` | Cancel button, search caret/focus ring, Confirm CTA, active tab |
| `--color-reading` / `--color-read` / `--color-want` | Status dots on pickers, badges, stats |
| `--r-control` (10px) | Search field, segmented pickers, Confirm / Remove / Logout buttons |
| `--r-card` (12px) | Meta row, stat cards |
| `--r-pill` (999px) | Status/category badges, add-btn, tabs |

**Destructive red** `#ff453a` (iOS system red) is used for the *Remove from library*
and *Log out* actions. It is not a library token — add it as `--color-destructive`
when these actions are implemented.

> **New token to add:** `--color-destructive: #ff453a` (dark) / `#ff3b30` (light),
> Tailwind `text-destructive` / `border-destructive`. Only used for Remove & Logout.

---

## Component mapping

Maps each mockup element to its future component under `src/components/`.
No production code is written in this issue.

### Search page → `src/app/(app)/search/page.tsx`

Presented **modally** from the library `+` button — full-screen, no bottom nav.

- **Search bar → `src/components/ui/SearchBar`**
  - Row: `flex items-center gap-2.5 px-4`. Field is
    `flex-1 flex items-center gap-2 bg-surface-1 rounded-[10px] px-3 py-[9px]`.
  - Auto-focus on mount (`autoFocus`), magnifier glyph left, `text-primary` input.
  - Focus ring: `outline outline-2 outline-accent`.
  - **Cancel** button (`text-accent`) dismisses the modal → back to library.
  - Debounce input (see `src/hooks/useDebounce`) before hitting the Google Books proxy.

- **Results list → `src/components/books/BookSearch` + rows**
  - Section hint (`Google Books · N results`): `text-xs uppercase tracking-wide
    text-tertiary font-semibold px-4 py-2`.
  - Row → `src/components/books/SearchResultRow`:
    `flex items-center gap-3 py-2.5 border-b border-separator`.

    | Visual | Google Books field |
    | ------ | ------------------ |
    | Thumbnail (44px, 2:3, `rounded-md`) | `volumeInfo.imageLinks.thumbnail` |
    | Title (`text-[15px] font-semibold`, 2-line clamp) | `volumeInfo.title` |
    | Author (`text-[13px] text-secondary` truncate) | `volumeInfo.authors[]` |
    | Year (`text-xs text-tertiary`) | `volumeInfo.publishedDate` (year only) |

  - **Fallback thumbnail** when no `imageLinks`: gradient tile + book glyph,
    identical treatment to the library `BookCard` fallback.
  - Chevron (`text-tertiary`) hints the row opens the add sheet.
  - Tapping a row opens the **add-book sheet** (board 3), pre-filled with that volume.

- **No-results / initial state → `src/components/ui/EmptyState`** (reused)
  - Centered 72px badge with a magnifier glyph, `No matches` heading, one-line hint
    echoing the query. The same component renders the pre-search prompt
    ("Search for a title or author to get started").

### Add-book flow → `src/components/books/AddBookSheet`

- **Sheet → `src/components/ui/Sheet`** (bottom sheet)
  - `absolute inset-x-0 bottom-0 bg-surface-1 rounded-t-[20px] border-t
    border-separator` with `p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]`.
  - Grabber pill on top (`w-9 h-[5px] rounded-full bg-separator`).
  - Dimmed scrim behind: `absolute inset-0 bg-black/50` (tap to dismiss).
  - Book header row (cover 50px + title + `author · year`), divider below.

- **Category picker → `src/components/ui/SegmentedControl`** (reused)
  - 2 columns: **Novel** (`novel`) · **Non-Fiction** (`non_fiction`).
  - Maps to `userBooks.category`; **Novel pre-selected** (matches schema
    `.default("novel")`).

- **Status picker → `src/components/ui/SegmentedControl`** (reused)
  - 3 columns: **Reading** (`reading`) · **Read** (`read`) · **Want** (`want_to_read`).
  - Each label carries its status dot (`reading`/`read`/`want` hue).
  - **Reading pre-selected** in the mockup — pick a sensible default at build.
  - Track uses `bg-surface-2`, active pill `bg-background` (one level darker than the
    sheet surface so the pill reads as recessed-into-surface, mirroring issue #8's
    segmented control on the library canvas).

- **Confirm → `bg-accent text-white rounded-[10px] w-full py-3.5 font-semibold`**
  - Label: `Add to library`. Fires the **add-book Server Action** (`src/actions/`)
    → inserts `books` (if new) + `userBooks` row for the session `user_id`, then
    dismisses the sheet and the search modal.

### Book detail page → `src/app/(app)/books/[id]/page.tsx`

Pushed navigation from a `BookCard`. Keeps the bottom nav (within the tab's stack).

- **Nav bar** → back button `< Novels` (`text-accent`), label = originating category.
- **Detail body → `src/components/books/BookDetail`** (Server Component; data from Turso).

  | Visual | Source field |
  | ------ | ------------ |
  | Hero cover (150px, 2:3, `rounded-[10px]`, large shadow) | `books.thumbnail` |
  | Title (`text-[22px] font-extrabold`) | `books.title` |
  | Author(s) (`text-[15px] text-secondary`) | `books.authors` |
  | Pages | `books.pageCount` |
  | Year | `books.publishedDate` (year) |
  | ISBN | `books.isbn13` |
  | Description | `books.description` |
  | Status badge | `userBooks.status` |
  | Category badge | `userBooks.category` |

- **Status badge → `src/components/ui/StatusBadge`**: pill
  (`rounded-full border border-separator bg-surface-1`) with status dot + label +
  chevron-down. Tapping opens a status picker (menu or reuse the segmented sheet)
  → **update-status Server Action**.
- **Category badge**: same pill, no dot; tapping opens the 2-way category picker →
  **update-category Server Action**.
- **Metadata row**: 3 equal cells in a `rounded-xl border border-separator
  bg-surface-1` card, `border-l` dividers. Big value over uppercase micro-label.
  Render `—` for any null field (e.g. missing `pageCount` / `isbn13`).
- **Description**: `text-sm leading-relaxed text-secondary`, left-aligned.
- **Remove → `src/components/ui/DestructiveButton`**: full-width outlined red
  button; confirm before firing the **remove-book Server Action** (deletes the
  `userBooks` row for this `user_id`, leaves the shared `books` row).

### Account page → `src/app/(app)/account/page.tsx`

Account tab active in the bottom nav.

- **Header**: large `Account` title + greeting line (`Hello, <name>`,
  `text-[15px] text-secondary`). Name/email from `auth()` session (`users.email`).
- **Stats → `src/components/library/StatsCards`** (Server Component)
  - **Hero total**: big count of all `userBooks` rows for the `user_id`.
  - **Per-category cards** (`Novels`, `Non-Fiction`): each a
    `rounded-xl border border-separator bg-surface-1 p-4` card holding a 3-up
    grid of `reading` / `read` / `want` counts with status dots.
  - All numbers come from a single grouped query:
    `count(*) … group by category, status where user_id = ?`.
- **Log out → `DestructiveButton`**: outlined red, calls the Auth.js `signOut()`
  server action → redirect to `/login`.

---

## States covered

- [x] Search — input (auto-focus, caret), populated results (cover/title/author/year)
- [x] Search — fallback thumbnail on results with no cover
- [x] Search — no-results state
- [x] Add flow — bottom sheet, category picker (Novel pre-selected), status picker, confirm
- [x] Book detail — hero cover, title/authors, description, pages/year/ISBN row
- [x] Book detail — status badge + change, category badge + change, remove button
- [x] Account — greeting, total, per-category × per-status breakdown, logout

## Notes for implementation

- Cover art in the mockup uses inline SVG data-URIs as stand-ins. In the app,
  covers come from the Google Books proxy; render the **fallback** whenever the
  thumbnail is null/empty (same rule as issue #8).
- Sample data (titles, counts, ISBN, description) is realistic purely to size the
  layout — the app never ships placeholder data; every value binds to Turso /
  Google Books.
- No page-progress UI: only `status` is tracked (per CLAUDE.md). `rating`/`notes`
  exist in the schema but are out of scope for this issue and not drawn.
- Light mode reuses the same token names with inverted surface/text values, plus the
  light `--color-destructive` variant noted above.

---

# Issue #43 — Search filters (language &amp; author)

Open `mockup-filters.html` — four boards at 390px, extending the search screen above.
Per the issue body, the artifacts live here in `docs/mockups/issue-9/` (alongside the
search boards they extend) rather than in a `docs/mockups/issue-43/` folder.

1. **Filters — collapsed (default)** — one 44px row, no vertical cost
2. **Filters — expanded (defaults)** — language chips + author input
3. **Language — “Other”** — reveals the ISO 639-1 code field
4. **Collapsed — filters active** — accent toggle, count badge, dismissible chips

No new tokens. Everything reuses the issue #8 palette, radii, and type scale.

## Design decisions

**Chips, not a segmented control.** The issue allows either. Six options (All /
English / French / Spanish / German / Other) in a segmented track at 390px leaves
~59px per column — `English` and `Spanish` truncate. A wrapped choice-chip row keeps
every label readable, hits the 44px touch minimum, and lets **Other** reveal a
sub-field in place, which a segment cannot do.

**Two-level active indicator.** The panel collapses but the state must stay legible,
so an applied filter shows up twice: the toggle turns accent-tinted with a count
badge, and each filter gets a dismissible chip in the collapsed row. `All` language
is the default and counts as *no* filter — the toggle stays neutral.

**The row never grows.** Chips scroll horizontally (`overflow-x-auto`) inside the
44px row instead of wrapping, so the results list never shifts as filters change.

## Component mapping

### Filter bar → `src/components/books/SearchFilters` (`'use client'`)

Renders between `SearchBar` and the results list inside `BookSearch`. Owns the
collapsed/expanded disclosure state; lifts filter values to `BookSearch`, which
already owns the query and the debounce.

```tsx
interface SearchFiltersProps {
  lang: string;                          // '' = All, else ISO 639-1
  author: string;
  onChange: (next: { lang: string; author: string }) => void;
}
```

| Element | Tailwind |
| ------- | -------- |
| Bar wrapper | `px-4 pb-2.5` |
| Row | `flex items-center gap-2 min-h-[44px]` |
| Toggle (hit area) | `inline-flex items-center h-[44px] p-0 border-0 bg-transparent` |
| Toggle pill (idle) | `inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full border border-separator bg-surface-1 text-[13px] font-semibold text-secondary` |
| Toggle pill (open) | `bg-surface-2 text-primary` + chevron `rotate-180` |
| Toggle pill (active) | `bg-accent/15 border-accent/45 text-accent` |
| Count badge | `min-w-[17px] h-[17px] px-1 rounded-full bg-accent text-white text-[11px] font-bold` |
| Chip | `inline-flex items-center gap-1.5 h-[30px] pl-2.5 pr-1.5 rounded-full bg-surface-2 border border-separator text-xs font-semibold max-w-[160px]` |
| Chip label | `truncate` |
| Chip dismiss | `relative w-[18px] h-[18px] rounded-full bg-white/[0.08] text-secondary` + hit-area `::after` |
| Chip scroller | `flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto py-[7px] -my-[7px]` |
| Clear all | `min-h-[44px] px-1.5 text-[13px] font-semibold text-accent` |

**Touch targets.** The visual pill is 34px but the `<button>` around it is 44px —
the same technique issue #8 used for the library `+` chip (see that README). Small
glyphs (chip `×`, author clear `×`) keep an invisible 44px hit area via a centered
pseudo-element:

```css
.hit-44::after {
  content: ""; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%); width: 44px; height: 44px;
}
```

The chip scroller needs `py-[7px] -my-[7px]` (30px chip + 7px × 2 = 44px), otherwise
`overflow-x-auto` clips those hit areas vertically.

`bg-accent/15`, `border-accent/45` and `bg-white/[0.08]` are valid Tailwind v4 —
opacity modifiers compile through `color-mix()` for any `--color-*` theme color.

The toggle needs `aria-expanded` and `aria-controls` pointing at the panel id.

### Expanded panel

| Element | Tailwind |
| ------- | -------- |
| Panel | `mt-2.5 p-3.5 rounded-xl bg-surface-1 border border-separator` |
| Field label | `text-xs uppercase tracking-wide font-semibold text-secondary mb-2` |
| Group spacing | `space-y-4` |

### Language filter → chip group

| Element | Tailwind |
| ------- | -------- |
| Group | `flex flex-wrap gap-2` + `role="group" aria-label="Language"` |
| Chip | `inline-flex items-center justify-center min-h-[44px] px-3.5 rounded-full border border-separator bg-surface-2 text-sm font-semibold text-secondary` |
| Chip selected | `bg-accent border-accent text-white` |

Single-select, backed by `aria-pressed` on each button (not a native radio group —
these are buttons, and only one is pressed at a time).

```ts
const LANGUAGES = [
  { label: 'All',     code: '' },
  { label: 'English', code: 'en' },
  { label: 'French',  code: 'fr' },
  { label: 'Spanish', code: 'es' },
  { label: 'German',  code: 'de' },
] as const;
// 'Other' is not in the list — it is a UI mode that reveals the ISO input.
```

**Other → ISO code input.** `maxLength={2}`, lower-cased on change,
`inputMode="text" autoCapitalize="off" autoCorrect="off"`. The proxy
(`src/app/api/books/search/route.ts`) validates `/^[a-z]{2}$/` and 400s otherwise,
so the client must not send a 1-char value: treat `lang.length !== 2` as *no
language filter* and skip the param. Surface the red hint only on blur with a
partial value — never while typing.

| Element | Tailwind |
| ------- | -------- |
| Wrapper | `mt-2.5` |
| Input shell | `flex items-center gap-2 min-h-[44px] px-3 max-w-[130px] rounded-[10px] bg-background border border-separator` |
| Input | `flex-1 min-w-0 bg-transparent text-[15px] text-primary outline-none lowercase` |
| Focused shell | `outline outline-2 outline-accent border-transparent` |
| Hint | `text-xs text-tertiary mt-1.5` |
| Hint (invalid) | `text-xs text-destructive mt-1.5` |

### Author filter → text input

Same `rounded-[10px]` treatment as the main search field, one surface level down
(`bg-background`, because the panel itself is `bg-surface-1`), person glyph on the
left, clear `×` on the right once non-empty.

| Element | Tailwind |
| ------- | -------- |
| Shell | `flex items-center gap-2 min-h-[44px] px-3 rounded-[10px] bg-background border border-separator` |
| Input | `flex-1 min-w-0 bg-transparent text-[15px] text-primary outline-none placeholder:text-tertiary` |
| Placeholder | `Filter by author...` |
| Clear `×` | `relative w-5 h-5 rounded-full bg-tertiary text-background` + hit-area `::after` |

Maps to the proxy's `author` param → `inauthor:` in the Google Books query.

## Wiring to the existing proxy

`GET /api/books/search` already accepts both filters (shipped in #45):

| UI state | Query param |
| -------- | ----------- |
| Language chip (not `All`) | `lang=<iso2>` |
| `Other` + valid 2-char code | `lang=<iso2>` |
| Author input, trimmed non-empty | `author=<text>` |

Both are omitted when empty. Filter changes go through the **same debounce as the
query** — reuse `useDebounce`, and refetch on any of `(q, lang, author)` changing.
A filter change with an empty `q` must not fire a request: `q` stays required.

## States covered

- [x] Collapsed, no filters — neutral toggle, no chips
- [x] Expanded, defaults — `All` selected, empty author
- [x] Expanded, `Other` — ISO field revealed, focused, valid value
- [x] Collapsed, 2 filters active — accent toggle + count + dismissible chips
- [x] Invalid ISO code — red hint (specified above; not drawn as its own board)

## Notes for implementation

- `--color-destructive` (already flagged above for Remove/Logout) is reused for the
  invalid-ISO hint. Still the only place a new token is needed.
- The chip row and the language chips are both `<button>`s, never `<a>` — no
  navigation, no URL state. Filters are component state, not search params.
- Result counts in the boards are illustrative only; the app renders whatever the
  proxy returns and never ships placeholder data.
