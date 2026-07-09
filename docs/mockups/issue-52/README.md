# Issue #52 — Account hero stat: pages read (mockups)

Design brief for adding `totalPagesRead` to the Account hero card.

Open `mockup.html` in a browser. Six boards: the recommended layout, the rejected alternative,
the states, the viewport range, both themes, and the type/colour spec.

**No new design token is introduced.** Every colour below already exists in the `@theme` block of
`src/app/globals.css`.

---

## The decision

The issue offers two layouts. **Take the split hero: one card, two columns, one hairline.**

The reason is hierarchy. Two identical side-by-side cards assert that the two numbers matter
equally. The brief says *Pages read* is secondary. Inside one card, the split reads as *here is
the headline number, and here is a detail about it* — which is what the data actually is, since
pages read is a slice of the same library the total counts. It also keeps the page's rhythm: one
hero, then Novels, then Non-Fiction.

Width is a secondary argument and a weaker one than it first looks. Two cards cost a 12px gutter
and two extra borders, taking each column's content from 137.5px to 131.5px at 375px. Six pixels
would not decide this on its own.

*Pages read* is demoted through three stacked signals, none of which needs a new colour:

| Signal | Total books | Pages read |
| --- | --- | --- |
| Size | 36px | 28px |
| Weight | 800 (`font-extrabold`) | 700 (`font-bold`) |
| Colour | `--primary` | `--secondary` |

---

## Markup

Replaces the hero `<div>` at `src/app/(app)/account/AccountStats.tsx:108-111`.

```tsx
<div className="rounded-2xl border border-separator bg-surface-1">
  <div className="grid grid-cols-2">
    <div className="flex min-w-0 flex-col items-center px-4 py-5">
      <p className="flex h-10 items-end whitespace-nowrap text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-primary">
        {formatCount(stats.total)}
      </p>
      <p className="mt-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-tertiary">
        Total books
      </p>
    </div>
    <div className="flex min-w-0 flex-col items-center border-l border-separator px-4 py-5">
      <p className="flex h-10 items-end whitespace-nowrap text-[28px] font-bold leading-none tracking-tight tabular-nums text-secondary">
        {formatCount(stats.totalPagesRead)}
      </p>
      <p className="mt-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-tertiary">
        Pages read
      </p>
    </div>
  </div>
</div>
```

```ts
const numberFormat = new Intl.NumberFormat('en-US');
const formatCount = (n: number): string => numberFormat.format(n);
```

### Class notes

| Class | Why |
| --- | --- |
| `grid grid-cols-2` | Not `flex`. A hard `1fr 1fr` stops a long page count from stealing width from the total. |
| `border-l border-separator` | On the second cell only. Reuses the card's own border colour, so the rule reads as part of the card rather than as a new element. Preferred over `divide-x` — one explicit border beats a utility that acts on `:not(:first-child)`. |
| `flex h-10 items-end` on the value | Gives both numerals an identical 40px box with the text pushed to its bottom. This is what **aligns the two labels** — without it the 36px and 28px values produce boxes of different heights and the labels sit ~8px apart. See the note below on what it does *not* do. |
| `leading-none` | Required for the above — the default line-height would pad the box unevenly per size. |
| `tabular-nums` | Fixed-width digits. Without it the number reflows slightly between renders. |
| `min-w-0` + `whitespace-nowrap` | A grid item defaults to `min-width: auto`, which would let a long value expand its column past `1fr`. `min-w-0` pins the column; `whitespace-nowrap` stops the number breaking across lines. |
| `mt-2` | Was `mt-1` on the single-stat card. The taller value box needs slightly more air below it. |

The existing `text-center` on the old hero is dropped — `items-center` on the flex column does the
same job and is what aligns the value box, not just its text.

### The numerals are not on a shared baseline

`items-end` bottom-aligns each **line box**, not each baseline. With `leading-none` the baseline
sits `(font-size − ascent + descent) / 2` above the box bottom — a distance that scales with the
font size. For typical metrics (ascent ≈ 0.95em, descent ≈ 0.25em) that is `0.15 × font-size`:
5.4px at 36px, 4.2px at 28px. **The 28px numeral therefore rests about 1px lower than the 36px
one.** The exact figure depends on Geist's metrics; the mechanism does not.

This is accepted. One pixel across a 12px column gap is below the threshold where anyone reads it
as a misalignment, and the thing the eye actually tracks — the two uppercase labels — is exact.

Getting a true shared baseline would mean giving up the two-column structure: a 2×2 grid with
`items-baseline` on the values row, and the vertical rule promoted to an absolutely-positioned
element, because grid baseline alignment offsets the item box and would drag a `border-l` down
with it, leaving a notch at the top of the rule. That is a lot of machinery for one pixel. If a
future change makes the two sizes further apart, revisit it.

---

## States

Board 3 in `mockup.html`. All four are the same card; nothing is conditionally hidden.

`totalPagesRead` sums `books.page_count`, which is nullable in the schema and missing from many
Google Books volumes. **A user with 40 finished books can legitimately see `0`.** So zero is a
normal value, not an empty state — render the `0`, keep the label, keep the geometry. Do not
special-case it with a dash, a hint, or a collapsed column.

Labels stay plural at 1 (`1 · Total books`). iOS stat cards do not inflect stat labels, and the
label describes the metric, not the value.

### Overflow

The *Pages read* cell has **137.5px** of content width at 375px — a 343px card, less 2px of
border, less 32px of padding, less the 1px rule, halved. Six digits plus a comma at 28px tabular
runs roughly 110px, so `412,880` fits with room left. Board 3 renders that stress case; check it
in a browser rather than trusting the estimate.

The layout never truncates or wraps. `min-w-0` plus a hard `1fr` means a runaway value overflows
the card rather than crushing the other column. Seven digits — a million pages, roughly 3,000
finished books — is out of range for a single-user library, so no defensive truncation is
specified.

---

## Number formatting

Both values are grouped: `8420` → `8,420`. Page counts run four to six digits and an ungrouped
`412880` is measurably slower to read. This also changes *Total books* once a library passes 999
(`1204` → `1,204`), which is intentional — two adjacent numerals formatted differently would look
like a bug.

Pin the locale (`'en-US'`) rather than relying on the runtime default. The app UI is English, and
an unpinned `toLocaleString()` would render `8 420` or `8.420` depending on where it runs.

---

## Implementation notes for whoever picks this up

- **`AccountStats.test.tsx:87` will fail.** Its zero-state assertion counts exactly 7 elements
  reading `"0"` (total + 3 novel statuses + 3 non-fiction statuses). Adding the pages stat makes
  it 8. The comment above it needs updating too. This is the only test the change breaks — the
  fixture at line 15 already carries `totalPagesRead: 8420`.
- No API change. `GET /api/stats` already returns `totalPagesRead`
  (`src/app/api/stats/route.ts:47`), filtered to `status = 'read'` and `abandoned = false`.
- `AccountStats` is already `'use client'`. `Intl.NumberFormat` is constructed once at module
  scope, not per render.
- Nothing else on the Account page changes.

---

## Accessibility

Ratios computed against `--surface-1` (`#161618` dark, `#f2f2f7` light):

| Text | Dark | Light | AA threshold |
| --- | --- | --- | --- |
| Value — `--primary` 36px | 16.60:1 | 15.25:1 | 3:1 (large) |
| Value — `--secondary` 28px/700 | 7.05:1 | 4.73:1 | 3:1 (large) |
| Label — `--tertiary` 13px | **3.42:1** | **2.30:1** | 4.5:1 (normal) |

The stat *values* pass comfortably — `--secondary` at 28px/700 qualifies as large text, and clears
even the stricter normal-text bar in both themes.

The stat *labels* fail, and this predates the issue. The existing `Total books` label already uses
`--tertiary`, as does every `section-label` on the page. `Pages read` inherits the same style for
consistency, so this issue neither worsens nor fixes it.

Promoting all labels from `--tertiary` to `--secondary` would clear AA in both themes (7.05:1 and
4.73:1). It is a real fix, not a partial one — but it touches every category heading in the app
and deserves its own issue rather than a silent ride-along here.
