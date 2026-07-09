# Issue #32 — Abandon a book + Rating (mockups)

Design brief for two features on `BookDetail` and the library grid:

1. **Abandon** — available only while a book is `reading`
2. **Rating** — optional 👍 / 😐 / 👎 for books that are `read` (abandoned books included)

Continues the visual language of issues #8 / #9 / #26 — same tokens, same iOS-native
dark theme. **One** new token is introduced: `--color-abandoned`.

Open `mockup.html` in a browser. Six boards, all at a 390 × 844 viewport:

1. **Status sheet — book is Reading** → the "Abandon" option, separated + destructive
2. **BookDetail — Read, not rated** → rating picker with no segment selected
3. **BookDetail — Read, rated Good 👍** → selected segment
4. **BookDetail — Abandoned, rated Bad 👎** → abandoned badge + cover scrim + DNF strip
5. **Library grid (Read tab)** → mix of unrated, rated, and abandoned books
6. **Status sheet — book is Read** → no "Abandon" option

---

## The data model this design assumes

**`abandoned` is a flag on top of the `read` status, not a fourth status.**

The issue states that abandoned books live in the **Read** tab and that rating is
available for `read` books *"including abandoned"*. Both fall out for free if abandoning
sets `status = 'read'` **and** `abandoned = true`, rather than introducing a
`status = 'abandoned'` member. Concretely this avoids:

- widening `ReadingStatus` (which would break the 3-way `SegmentedControl`, the
  2-way `SubTabs`, `STATUS_DOT_CLASS`, and every `Record<ReadingStatus, …>` map);
- a fourth library tab that the issue explicitly does not ask for;
- a special case in "is this book rateable?" (it stays `status === 'read'`).

Suggested schema delta for the implementation issue (**not** written here):

```ts
// src/lib/db/schema.ts — userBooks
abandoned: integer('abandoned', { mode: 'boolean' }).notNull().default(false),
rating: text('rating', { enum: ['good', 'average', 'bad'] }),  // nullable = unrated
```

```ts
// src/types/books.ts
export type BookRating = 'good' | 'average' | 'bad';
```

State transitions the UI implies:

| Action                          | `status`        | `abandoned` | `rating`   |
| ------------------------------- | --------------- | ----------- | ---------- |
| Tap **Abandon** (from Reading)  | → `read`        | → `true`    | unchanged  |
| Tap **Reading** on an abandoned book | → `reading` | → `false`   | unchanged¹ |
| Tap **Want to Read**            | → `want_to_read`| → `false`   | unchanged¹ |
| Tap a rating segment            | unchanged       | unchanged   | → that value |
| Tap the **selected** segment    | unchanged       | unchanged   | → `null`   |

¹ The rating is kept in the DB but hidden while `status !== 'read'`; re-marking the book
as Read shows it again. Clearing it on every status change would silently destroy user data.

---

## New design token

| `@theme` token       | Dark      | Light     | Tailwind class                            | Usage                       |
| -------------------- | --------- | --------- | ----------------------------------------- | --------------------------- |
| `--color-abandoned`  | `#c4726a` | `#a8443c` | `bg-abandoned` / `text-abandoned`         | Abandoned badge, DNF strip  |

Add to `src/app/globals.css`:

```css
:root {
  --abandoned: #c4726a;
}

@media (prefers-color-scheme: light) {
  :root {
    --abandoned: #a8443c;
  }
}

@theme inline {
  --color-abandoned: var(--abandoned);
}
```

### Why not reuse `--color-destructive`?

`--color-destructive` (`#ff453a`) is a full-saturation alarm red, reserved for **actions
that destroy data** — "Remove from library", and the "Abandon" row in the status sheet.
A book you gave up on is not an error. Painting its badge and cover strip in the same
alarm red overstates it and visually collides with the removal affordance sitting a few
hundred pixels below. `--color-abandoned` is a desaturated coral: unmistakably in the red
family, but calm, and far enough from `--color-reading` (`#ff9f0a`) that the two dots never
read as the same colour.

So: **the Abandon *action* is `destructive`; the abandoned *state* is `abandoned`.**

### Contrast

| Pair                                                       | Ratio   | Verdict     |
| ---------------------------------------------------------- | ------- | ----------- |
| `#c4726a` text on `#0a0a0b` (dark bg)                       | 5.65:1  | AA ✓        |
| `#a8443c` text on `#ffffff` (light bg)                      | 5.87:1  | AA ✓        |
| `#c4726a` badge text on `bg-abandoned/15` over the dark bg  | 4.81:1  | AA ✓        |
| DNF strip: `--color-background` ink on `--color-abandoned`  | 5.97:1 dark / 5.87:1 light | AA ✓ |

The DNF strip uses **`text-background`**, not `text-white`. White on `#c4726a` is only
3.5:1 — it fails AA for the 9–11px uppercase strip. Using `--color-background` as ink
gives near-black-on-coral in dark mode and white-on-coral in light mode, both AA, with a
single class.

---

## Component mapping

### 1. Status sheet → `src/components/books/BookDetail.tsx`

The existing `Sheet` renders `STATUS_OPTIONS.map(...)`. Append, **only when
`status === 'reading'`**, a separator + an Abandon row:

```tsx
{status === 'reading' ? (
  <>
    <div className="my-1.5 h-px bg-separator" />
    <button
      type="button"
      disabled={pending}
      onClick={handleAbandon}
      className="flex w-full items-center gap-3 py-3 text-left font-semibold text-destructive disabled:opacity-60"
    >
      <XCircleIcon />
      <span className="flex-1 text-[15px]">Abandon</span>
    </button>
    <p className="pb-0.5 text-xs text-tertiary">Marks the book as read and flags it Did Not Finish.</p>
  </>
) : null}
```

| Visual              | Tailwind                                                           |
| ------------------- | ------------------------------------------------------------------ |
| Separator           | `h-px bg-separator my-1.5`                                          |
| Abandon row         | `flex w-full items-center gap-3 py-3 text-left text-destructive font-semibold` |
| Abandon icon        | 18px circle-cross, `stroke-[2.2]`, `text-destructive`               |
| Hint line           | `text-xs text-tertiary`                                             |

The three regular status rows are unchanged. Board 6 shows the sheet for a `read` book —
the whole block above is absent.

> The hint line is not decoration: "Abandon" placed under a destructive separator reads
> like "Delete" at a glance. One line stating that the book is kept, moved to Read, and
> flagged DNF is what stops the user from hesitating.

### 2. Rating picker → new `src/components/books/RatingPicker.tsx`

Rendered on `BookDetail` **between the badge row and the metadata grid**, only when
`status === 'read'` (which, per the model above, covers abandoned books).

Structurally this is `SegmentedControl` with two differences: the value is **nullable**
(nothing selected by default) and each segment carries an emoji. Two options:

- **Preferred** — widen `SegmentedControl` to accept `value: T | null` and an optional
  `icon?: string` per option, then use it directly. `aria-pressed` already handles the
  unselected case; `COLS_CLASS[3]` already exists.
- Otherwise, a standalone `RatingPicker` copying the same shell classes.

```tsx
const RATING_OPTIONS = [
  { value: 'good',    label: 'Good',    icon: '👍' },
  { value: 'average', label: 'Average', icon: '😐' },
  { value: 'bad',     label: 'Bad',     icon: '👎' },
] as const;
```

| Visual               | Tailwind                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| Shell                | `grid grid-cols-3 gap-[3px] rounded-[10px] bg-surface-2 p-[3px] mb-[18px]`  |
| Segment (idle)       | `rounded-lg px-1 py-[9px] text-[13px] font-semibold text-secondary`         |
| Segment (selected)   | `bg-background text-primary shadow-sm`                                       |
| Emoji (idle)         | `text-[15px] leading-none grayscale opacity-65`                              |
| Emoji (selected)     | `grayscale-0 opacity-100`                                                    |
| Layout inside button | `flex items-center justify-center gap-1.5`                                   |

Identical shell to `SegmentedControl` on purpose — the rating picker must read as the
same control family as the status/sub-tab pickers, not as a new widget.

Behaviour:
- Default is **no selection** — the rating is optional and must never be inferred.
- Tapping the selected segment **clears** the rating (`→ null`). There is no other
  affordance to un-rate a book, and rating is stated as optional.
- Wire to a `updateBookRating(userBookId, rating: BookRating | null)` Server Action,
  same optimistic-`useState` + `router.refresh()` shape as `handleSelectStatus`.
- `role="group"` + `aria-label="Rating"` on the shell; `aria-pressed` on each segment.
- The emoji is decorative — the text label carries the meaning for screen readers.

### 3. Abandoned badge → `BookDetail.tsx` badge row

When `abandoned`, the abandoned badge **replaces** the green Read badge (it does not sit
next to it — status is still `read`, but the flag is the more specific truth).

| Visual                    | Tailwind                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| Badge (normal, existing)  | `rounded-full border border-separator bg-surface-1 px-3.5 py-[7px] text-[13px] font-semibold` |
| Badge (abandoned)         | `border-abandoned/45 bg-abandoned/15 text-abandoned`               |
| Dot (abandoned)           | `h-2 w-2 rounded-full bg-abandoned`                                |
| Label                     | `Abandoned`                                                        |

Tapping it still opens the status sheet — that is how a book gets un-abandoned.
Extend `STATUS_DOT_CLASS` usage with an `abandoned ? 'bg-abandoned' : STATUS_DOT_CLASS[status]`
guard rather than adding a key to the record.

### 4. Cover treatments → `HeroCover` (detail) and `BookCard` (grid)

**Detail hero (150px wide):**

| Visual        | Tailwind                                                              |
| ------------- | --------------------------------------------------------------------- |
| Scrim         | `absolute inset-0 z-10 bg-black/55` (sibling of the `<Image>`)         |
| DNF strip     | `absolute inset-x-0 bottom-0 z-20 bg-abandoned py-1.5 text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-background` |
| Strip label   | `Did Not Finish` (the hero has room for the full phrase)               |

**Grid card:**

| Visual        | Tailwind                                                              |
| ------------- | --------------------------------------------------------------------- |
| Scrim         | `absolute inset-0 bg-black/50`                                         |
| DNF strip     | `absolute inset-x-0 bottom-0 z-[3] bg-abandoned py-[3px] text-center text-[9px] font-extrabold tracking-[0.08em] text-background` |
| Strip label   | `DNF` (abbreviated — the card is ~110px wide)                          |

The scrim is what does the work at grid scale: an abandoned book reads as *dimmed* from
across the screen, and the strip confirms it up close.

The scrim is **`bg-black/…`, not `bg-background/…`.** `--color-background` is white in
light mode, so a `bg-background` scrim would wash the cover out rather than dim it — the
"this book is faded back" reading only survives if the scrim is black in both themes.
`Sheet.tsx:34` already sets the precedent with its `bg-black/50` backdrop.

The DNF strip, by contrast, *does* use `text-background` — see the contrast note above.
The two are opposite on purpose: the scrim needs a mode-invariant colour, the strip needs
a mode-flipping one.

### 5. Rating badge on the card → `BookCard.tsx`

Only rendered when `rating !== null`. Top-right of the cover, above the scrim.

| Visual   | Tailwind                                                                                   |
| -------- | ------------------------------------------------------------------------------------------ |
| Chip     | `absolute right-[5px] top-[5px] z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/15 bg-black/70 text-xs backdrop-blur-[6px]` |

Sits above the abandoned scrim (`z-[3]`) so a DNF + rated book shows both, as in board 5
(*Infinite Jest* — dimmed cover, DNF strip, 👎 chip). Black-tinted, not `bg-background/70`,
for the same light-mode reason as the scrim.

**The chip needs an accessible label.** On `BookDetail` the emoji is decorative because the
segment's text label carries the meaning — on the grid card there is no text, so an
emoji-only chip conveys the rating to sighted users only:

```tsx
<span className="...">
  <span className="sr-only">Rated good</span>
  <span aria-hidden="true">👍</span>
</span>
```

`BookCardProps` gains `rating: BookRating | null` and `abandoned: boolean`; `BookGrid`
passes them through from the `LibraryEntry`. The abandoned card also needs the DNF strip
readable by assistive tech — `DNF` alone is not a word, so give the strip an
`aria-label="Did not finish"` (or the same `sr-only` treatment).

### 6. Library sub-tabs — unchanged

Board 5's Reading/Read tabs are the existing `SubTabs` component, rendered verbatim
(`bg-surface-1` track, `gap-0.5`, active `bg-surface-2 shadow-sm`). Note this is **not**
the `SegmentedControl` recipe (`bg-surface-2` track, `gap-[3px]`, active `bg-background`),
which is what the rating picker uses. The two controls look similar and are styled
differently on purpose — do not unify them while implementing this issue.

---

## States covered

- [x] Status sheet with Abandon (book is `reading`) — board 1
- [x] Status sheet without Abandon (book is `read`) — board 6
- [x] BookDetail `read`, unrated — board 2
- [x] BookDetail `read`, rated Good — board 3
- [x] BookDetail abandoned, rated Bad, badge + cover overlay — board 4
- [x] Library grid: normal / rated / abandoned / abandoned+rated — board 5

## Notes for implementation

- Abandon is **not** a destructive action in the data sense (nothing is deleted), so it
  gets **no confirmation sheet** — unlike "Remove from library". It is one tap, and one
  tap on "Reading" undoes it.
- Touch targets: the sheet's Abandon row is ~46px tall (`py-3` + a 22px line box), clearing
  the 44px iOS minimum like the status rows beside it. The **rating segments are ~39px**
  (`py-[9px]`), i.e. below 44px — but that is exactly the height of the existing
  `SegmentedControl` and `SubTabs` segments, and matching them is what makes the picker read
  as the same control family. This design keeps the existing sizing rather than making the
  rating picker the one oversized control on the screen. If the 44px floor is to be enforced,
  it should be raised across all three components in a separate issue, not here.
- Emoji render differently per platform. They are decorative only — never the sole carrier
  of the rating's meaning. Labels stay visible at every breakpoint.
- No light-mode board is drawn: light mode reuses the same token names with the inverted
  values in `globals.css`, plus the new `--abandoned` value in the table above.
- Book titles/authors/ISBNs in the boards are illustrative mockup content only. The app
  itself ships no placeholder data — everything comes from Turso / Google Books.
