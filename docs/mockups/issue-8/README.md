# Issue #8 — App shell & library pages (mockups)

Design brief for the app shell (bottom navigation) and the library pages
(Novels & Non-Fiction). This issue **establishes the visual language for the
entire app** — the tokens below are the seed for `docs/DESIGN_SYSTEM.md`.

> **Folder note:** the issue body references `docs/mockups/issue-3/`, but that is
> a typo (issue #3 was the CLAUDE.md alignment). Per the `fix-issue` skill and the
> `ui-designer` agent, all artifacts for this issue live in `docs/mockups/issue-8/`.

Open `mockup.html` in a browser. It contains four boards, all at a 390px viewport:

1. **Novels — Currently Reading** (populated grid + reading progress)
2. **Novels — Want to Read** (empty state)
3. **Non-Fiction — Read** (populated grid, second tab active)
4. **BookCard — component states** (cover / cover+progress / fallback)

---

## Design language (dark theme, primary)

Mobile-only, iOS-native. Designed for 375–430px; boards shown at **390px**.
Dark mode is the primary theme (reading happens at night). Light mode inverts
surfaces/text using the same token names.

### Color tokens → Tailwind `@theme`

Add these to `src/app/globals.css` under `@theme` (Tailwind v4, no config file).

> **Tailwind v4 namespace:** utilities are auto-generated only from the
> **`--color-*`** namespace, so every token must be declared as `--color-<name>`
> (e.g. `--color-surface-1`) for `bg-surface-1` / `text-reading` / `border-separator`
> to exist. The mockup's `:root` uses shorthand var names (`--surface-1`) purely
> because it is a static HTML file; the real tokens use the `--color-` prefix below.

| `@theme` token (CSS var) | Dark value | Light value | Tailwind class                | Usage                                   |
| ------------------------ | ---------- | ----------- | ----------------------------- | --------------------------------------- |
| `--color-background`     | `#0a0a0b`  | `#ffffff`   | `bg-background`               | App canvas                              |
| `--color-surface-1`      | `#161618`  | `#f2f2f7`   | `bg-surface-1`                | Tab bar, segmented-control track        |
| `--color-surface-2`      | `#202024`  | `#ffffff`   | `bg-surface-2`                | Active segment pill, `+` button, covers |
| `--color-separator`      | `#2a2a2e`  | `#d8d8dd`   | `border-separator`            | Hairlines, card borders                 |
| `--color-primary`        | `#f5f5f7`  | `#1c1c1e`   | `text-primary`                | Titles, active labels                   |
| `--color-secondary`      | `#a1a1aa`  | `#6b6b73`   | `text-secondary`              | Authors, inactive segment labels        |
| `--color-tertiary`       | `#6b6b73`  | `#a1a1aa`   | `text-tertiary`               | Inactive tab icons, empty-state icon    |
| `--color-accent`         | `#0a84ff`  | `#007aff`   | `text-accent` / `bg-accent`   | Active tab, `+`, CTA buttons            |
| `--color-reading`        | `#ff9f0a`  | `#f59e0b`   | `text-reading` / `bg-reading` | Currently-reading progress + page count |
| `--color-read`           | `#30d158`  | `#28a745`   | `bg-read`                     | Finished status accents                 |
| `--color-want`           | `#5e5ce6`  | `#5856d6`   | `bg-want`                     | Want-to-read status accents             |

Light values swap under `@media (prefers-color-scheme: light)` (or a `:root.light`
override); dark is the default. Both themes share the same class names above.

### Radius / spacing tokens

| Token        | Value   | Applied to                         |
| ------------ | ------- | ---------------------------------- |
| `--r-card`   | `12px`  | `rounded-xl` — sheets, empty badge |
| Cover radius | `8px`   | `rounded-lg` — book covers         |
| `--r-control`| `10px`  | segmented control track            |
| `--r-pill`   | `999px` | `rounded-full` — `+`, CTA, tabs    |
| Grid gap     | `16px 12px` | `gap-y-4 gap-x-3`              |
| Screen inset | `16–20px` | `px-4` / `px-5`                  |
| Safe bottom  | `34px`  | `pb-[env(safe-area-inset-bottom)]` |

### Typography

| Element          | Size / weight        | Tailwind                       |
| ---------------- | -------------------- | ------------------------------ |
| Large title      | 32px / 800           | `text-[32px] font-extrabold tracking-tight` |
| Segment label    | 13px / 600           | `text-[13px] font-semibold`    |
| Book title       | 12px / 600, 2-line clamp | `text-xs font-semibold line-clamp-2` |
| Book author      | 11px / 400, truncate | `text-[11px] text-secondary truncate` |
| Page progress    | 10px / 600, reading  | `text-[10px] font-semibold text-reading` |
| Tab label        | 10px / 600           | `text-[10px] font-semibold`    |

---

## Component mapping

Maps each mockup element to its future component under `src/components/`.
No production code is written in this issue — implementation is a separate issue.

### App shell / bottom navigation → `src/components/ui/BottomNav`

- 3 tabs: **Novels** (`category = novel`), **Non-Fiction** (`category = non_fiction`),
  **Account** (`/profile`). Routes live under `src/app/(app)/`.
- Fixed bottom bar, translucent: `bg-surface-1/90 backdrop-blur-xl border-t border-separator`.
- Height `56px` + `env(safe-area-inset-bottom)` padding → iOS home-indicator safe area.
- **Active state:** `text-accent`, filled/active icon. **Inactive:** `text-tertiary`.
- Each tab = icon (24px) stacked over 10px label. Touch target spans full column
  height (≥44px, meets iOS minimum).
- Icons are inline SVG (SF-Symbols-like): two-page book, document-with-lines,
  person-in-circle. Swap for the project icon set at implementation.

### Library page header → `src/app/(app)/library` layout

- Large iOS title (`Novels` / `Non-Fiction`) left, `+` button top-right.
- `+` button → 34px `rounded-full bg-surface-2 text-accent` visual chip; opens the
  add/search flow. Extend the hit area to ≥44px (iOS minimum) via padding on the
  wrapping button (`p-[5px]` around the 34px chip), not by enlarging the chip.

### Sub-tabs (status filter) → `src/components/ui/SegmentedControl`

- iOS segmented control over `userBooks.status`:
  **Reading** (`reading`) · **Read** (`read`) · **Want to Read** (`want_to_read`).
- Track: `bg-surface-1 rounded-[10px] p-[3px]`, 3 equal columns.
- Active segment: `bg-surface-2 text-primary` pill with soft shadow; inactive `text-secondary`.

### Book grid → `src/components/library/LibraryList`

- 3-column grid: `grid grid-cols-3 gap-y-4 gap-x-3`.
- Vertically scrolls between header/segment (fixed) and tab bar (fixed).

### BookCard → `src/components/books/BookCard`

Props map to schema (`books` + `userBooks`):

| Visual              | Source field                          |
| ------------------- | ------------------------------------- |
| Cover image         | `books.thumbnail`                     |
| Title               | `books.title`                         |
| Author              | `books.authors`                       |
| Progress ribbon %   | `userBooks.currentPage / books.pageCount` |
| Page label          | `currentPage` / `pageCount`           |

**States (board 4):**

- **A — With cover:** 2:3 `rounded-lg` image, `object-cover`, soft shadow.
- **B — With cover + progress:** adds a 4px `bg-reading` ribbon along the cover
  bottom + `p. X / Y · Z%` line in reading amber. Shown only for `status = reading`.
- **C — Fallback (no `thumbnail`):** gradient tile (`from-surface-2 to-surface-1`,
  `border border-separator`) with the title clamped to 4 lines and a small book
  glyph. Guarantees no broken-image and keeps the grid rhythm intact.

**Null `pageCount`:** `books.pageCount` is nullable. When it is null on a
`reading` book, omit the progress ribbon and show only `p. <currentPage>` (never
compute a percentage) — no divide-by-null.

### Empty state → `src/components/ui/EmptyState`

- Centered: 72px `rounded-full` badge (`bg-surface-1 border-separator`) with a
  book glyph, `Nothing here yet` heading, one-line hint, and a primary
  `+ Add a book` pill (`bg-accent text-white rounded-full`).
- Copy adapts per sub-tab (e.g. "Books you want to read will show up here").

---

## States covered

- [x] Bottom nav — active & inactive tab states, icon + label, iOS safe area
- [x] Novels header — title + `+` button
- [x] Sub-tabs — all three, each shown active across boards
- [x] Book grid — 3 columns, cover + title + author
- [x] Empty state — per sub-tab
- [x] BookCard — with cover, with cover + progress, fallback (no cover)

## Notes for implementation

- Cover art in the mockup uses inline SVG data-URIs as stand-ins. In the app,
  `books.thumbnail` comes from the Google Books proxy; render the **fallback**
  whenever it is null/empty.
- No light-mode board is drawn: light mode reuses the same token names with
  inverted surface/text values (define alongside dark in `globals.css`).
- Sample titles are real books (no lorem ipsum) purely to size the layout;
  the app never ships placeholder data.
