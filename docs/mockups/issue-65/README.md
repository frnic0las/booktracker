# Issue #65 — Search results with source badges (OL / GB)

Design brief for showing **where a search result came from** — OpenLibrary or Google Books —
now that the search API queries both catalogs (PR #67). Continues the visual language of
issues #8, #9 and #59: same tokens, same iOS-native dark theme. **No new colours and no new
radii are introduced.**

Open `mockup.html` in a browser. Six boards, 390px viewport:

1. **Grouped results** — one header per source, one badge per row. The target state.
2. **Single source** — what the API actually returns today, and why the badge is redundant in it.
3. **Loading** — source-agnostic skeleton.
4. **No results** — "Nothing matched … in OpenLibrary or Google Books".
5. **Scan → Google Books** — the scanned ISBN resolved in GB.
6. **Badge specs** — 4× anatomy, geometry, light-scheme check, rejected hue variant.

---

> **Status — superseded by issue #70.** Scope B shipped: the API now queries both catalogs in
> parallel and merges them, so board 1 is the real screen and the two deferred pieces (the
> `SourceBadge` and the `SearchResultRow` cover-wrapper restructure) are implemented. The two
> open questions below are kept as the record of how that was decided.

## Two things to decide before any code is written

### 1. The API cannot produce "both sources" today

The issue asks for *"two result blocks: OpenLibrary first, then Google Books"* and *"mixed
results: show both sources grouped"*. `src/app/api/books/search/route.ts` is a **fallback
chain**, not a merge: it returns OpenLibrary's results, and queries Google Books **only** if
OpenLibrary returned zero. A response therefore always carries exactly one `source`.

So board 1 is unreachable in production, and board 2 is the real screen.

- **Scope A — frontend only.** Group by source and label the group. One group, always. Board 2.
- **Scope B — merge the catalogs first.** A separate backend issue: query both in parallel,
  dedupe on ISBN-13, decide the interleaving. Then board 1 becomes real.

### 2. In Scope A, the per-row badge says nothing the header hasn't already said

Look at board 2: three rows, three identical `GB` chips, under a header that already reads
"Google Books". Twenty rows means twenty redundant chips on twenty covers — against a
"cover first" layout whose whole point is that the cover and title carry the screen.

**Recommendation: ship the group header now, hold the badge until the API merges.** The badge
is designed, spec'd and ready below; it just has nothing to disambiguate until there are two
groups on screen. If Nicolas would rather ship the badge now anyway (it does make the source
legible without scrolling up to the header), the spec is complete and the component is ~15
lines — but that is a call to make deliberately, not by default.

---

## The colour decision — the badge is monochrome, on purpose

The first pass hue-coded the badges: amber (`--reading`) for OpenLibrary, blue (`--accent`)
for Google Books. **Both halves were wrong**, and the mockup keeps that variant on board 6 as
a record.

- **Amber is taken.** `--reading` is the "Reading" status dot in
  `AddBookSheet.tsx:26` → `SegmentedControl` — a 7px amber circle. That sheet opens when the
  user *taps one of these very rows*. An amber dot meaning "OpenLibrary" on the list, then an
  amber dot meaning "Reading" one tap later, is a collision.
- **Blue is taken.** `--accent` means "tappable" everywhere else — Cancel, the scan glyph, the
  EmptyState CTA, and in board 5 the "Add to library" button sitting directly under the badge.
  A blue chip *inside* a `<button>` reads as a second button.
- **There is no free hue.** `--read` green, `--want` indigo and `--destructive` red all carry
  meanings, and indigo is indistinguishable from accent blue at a 9px glyph anyway.
- **Blue also failed contrast.** Composited over the scrim on a light cover, `#0a84ff` lands
  at ~3.5:1 — under AA for a 9px glyph. Amber held; blue didn't.

So the badge takes no hue at all: **white letters on a dark scrim**. The `OL` / `GB` letters
carry the meaning, the group header above glosses them in full words, and the design stops
borrowing a signal it can't afford. This is also what the accessibility rule already demanded —
colour was never allowed to be the only channel; here it is simply not a channel.

**The scrim does not flip in light mode.** The badge floats on cover artwork, not on the page
canvas, and cover art is as likely to be light in dark mode as in light mode. White-on-dark
holds ≥ 12:1 over any cover in either scheme. Same precedent as the camera overlays in issue
#59 (`.statusbar.over-camera`): chrome that sits on media is scheme-independent.

---

## Tokens used

All inherited verbatim. See issue #8's README for the full `@theme` table.

| Token | Where it appears |
| ----- | ---------------- |
| `--color-background` | Screen canvas |
| `--color-surface-1` | Search field, filter chips, skeleton fill, EmptyState icon ring |
| `--color-surface-2` | Cover fallback, sheet grabber |
| `--color-separator` | Row dividers, chip and icon-ring borders |
| `--color-primary` | Result titles |
| `--color-secondary` | Author line, EmptyState description |
| `--color-tertiary` | Group header, year, cover-placeholder glyph, EmptyState icon |
| `--color-accent` | Cancel / scan actions, "Add to library" CTA — **not the badge** |

The badge's `bg-black/80`, `border-white/20` and `text-white` are the one intentional
non-token set: they are overlay chrome on arbitrary artwork, no `@theme` colour carries alpha,
and they must not flip with the colour scheme. Status hues (`--reading`, `--read`, `--want`)
appear nowhere in this design.

---

## Component mapping

| Board element | Component | File | Change |
| ------------- | --------- | ---- | ------ |
| Group header | `SearchResultGroup` | `src/components/books/SearchResultGroup.tsx` | **new** |
| Results list, grouping, states | `BookSearch` | `src/components/books/BookSearch.tsx` | **edit** — group by `source`, replace the ad-hoc header (lines 161–170), swap "Searching…" for the skeleton, reword the empty state |
| Loading skeleton | `SearchResultSkeleton` | `src/components/books/SearchResultSkeleton.tsx` | **new** |
| Result row | `SearchResultRow` | `src/components/books/SearchResultRow.tsx` | **edit, only if the badge ships** — restructure the cover wrapper (see below) |
| Source badge | `SourceBadge` | `src/components/books/SourceBadge.tsx` | **new, only if the badge ships** |
| No-results copy | `EmptyState` | `src/components/ui/EmptyState.tsx` | unchanged — new `title` / `description` props only |
| Scan flow | `BarcodeScanner` → `BookSearch` | — | unchanged — the ISBN already flows through the same search path, so it inherits the header for free |

`BookSearchResult.source` (`'openLibrary' | 'googleBooks'`) already exists in
`src/types/books.ts` and is already populated by the mappers. **No type or API change is needed.**

---

## Tailwind recipes

### Group header

```tsx
const SOURCE_LABEL: Record<BookSource, string> = {
  openLibrary: 'OpenLibrary',
  googleBooks: 'Google Books',
};

<p className="px-4 pb-1.5 pt-2.5 text-xs font-semibold uppercase tracking-wider text-tertiary">
  {SOURCE_LABEL[source]} <span className="font-normal">· {count} results</span>
</p>
```

Grouping in `BookSearch` — order is fixed (OpenLibrary first), empty groups are not rendered:

```tsx
const groups = (['openLibrary', 'googleBooks'] as const)
  .map((source) => ({ source, items: results.filter((r) => r.source === source) }))
  .filter((group) => group.items.length > 0);
```

### Source badge

```tsx
export interface SourceBadgeProps {
  source: BookSource;
}

export function SourceBadge({ source }: SourceBadgeProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-6 items-center
                 justify-center rounded-md border border-white/20 bg-black/80 px-1.5
                 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm
                 backdrop-blur-sm"
    >
      {source === 'openLibrary' ? 'OL' : 'GB'}
    </span>
  );
}
```

`pointer-events-none` is load-bearing: the badge sits on top of the cover *inside* the row
`<button>`, so hit-testing and `:active` styling stay on the row alone.

### Cover wrapper — `overflow-hidden` clips the badge

Both cover branches in `SearchResultRow.tsx` currently carry `w-11 shrink-0` themselves, and
the image branch also carries `overflow-hidden` — which would **clip the badge's 4px overhang**
(`-top-1 -right-1`). The badge needs a wrapper that is *not* clipped, and the branches drop to
`w-full`:

```tsx
<div className="relative w-11 shrink-0">
  {result.coverUrl ? (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-surface-2 shadow-sm">
      <Image src={result.coverUrl} alt="" fill sizes="44px" className="object-cover" />
    </div>
  ) : (
    <div className="flex aspect-[2/3] w-full items-center justify-center rounded-md border
                    border-separator bg-gradient-to-br from-surface-2 to-surface-1 text-tertiary">
      {/* unchanged placeholder glyph */}
    </div>
  )}
  <SourceBadge source={result.source} />
</div>
```

Both branches then sit in the same wrapper, so a cover-less result gets the badge at identical
coordinates (board 1, third row).

### Loading skeleton

Replaces `<p>Searching…</p>` (`BookSearch.tsx:152`). Tailwind's built-in `animate-pulse` — no
custom keyframes:

```tsx
<div className="px-4" aria-busy="true" aria-label="Searching">
  {Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="flex items-center gap-3 border-b border-separator py-2.5 last:border-b-0">
      <div className="aspect-[2/3] w-11 shrink-0 animate-pulse rounded-md bg-surface-1" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-1" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-1" />
        <div className="h-2 w-1/4 animate-pulse rounded bg-surface-1" />
      </div>
    </div>
  ))}
</div>
```

`bg-surface-1` on the light scheme is `#f2f2f7` on a white canvas, so the pulse is faint there.
That is the iOS convention (light-mode skeletons are barely-there), and the rest of the app
uses the same fill — but it is the one place where "works in both schemes" is thin.

### No-results copy

```tsx
<EmptyState
  title="Book not found"
  description={`Nothing matched “${debouncedQuery}” in OpenLibrary or Google Books. Check the spelling, or try the ISBN.`}
/>
```

---

## States

| State | Trigger | Rendering |
| ----- | ------- | --------- |
| Idle | Empty query | Unchanged — "Search for a book" + Scan barcode CTA |
| Loading | `loading === true` | Five skeleton rows. No header, no badges — the source is not known yet |
| Results — one source | Today's fallback API | One group header + its rows (board 2) |
| Results — both sources | API merges (Scope B) | Two group headers, OpenLibrary first (board 1) |
| No results | `results.length === 0` | "Book not found", both catalogs named (board 4) |
| Error | `error === true` | Unchanged — "Something went wrong" |
| Scan | ISBN resolved | Same grouped row; the header names the source that answered (board 5) |

**The UI must not claim a book is absent from OpenLibrary.** `route.ts` falls through to Google
Books both when OpenLibrary returns zero results *and* when it throws. During an OL outage,
every result would be GB — so "Google Books" means *"this came from GB"*, never *"this is not in
OL"*. No copy anywhere may imply the stronger claim.

---

## Accessibility & touch

- **Tap targets**: rows are 86px tall (66px cover + 2×10px padding), far over the iOS 44px
  minimum. The badge is `pointer-events-none` and takes nothing from the row's target.
- **Screen readers**: the badge is `aria-hidden` — "OL" read aloud on every row is noise. The
  source is announced once per group by the header, which is the right granularity.
- **Contrast**: white on the `bg-black/80` scrim, composited over the cover behind it, is
  **12.6:1 in the worst case** — a pure-white cover — and higher over every darker one. Well
  clear of AAA (7:1), in both colour schemes, whatever the artwork.
- **Colour is not a channel here at all** — see the colour decision above. Fully colour-blind safe.

---

## Out of scope

- Merging / deduping the two catalogs in the API — needs its own backend issue (Scope B above).
- Badges outside search: `BookCard`, `BookDetail` and the library lists stay untouched. Once a
  book is added, the source is an implementation detail.
- A source filter ("search OpenLibrary only"). Not asked for, and with two sources the header
  already answers what the filter would.
