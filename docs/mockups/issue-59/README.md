# Issue #59 — ISBN barcode scanner flow (mockups)

Design brief for the **barcode scanning flow** that lets the user add a book by
pointing the camera at the ISBN barcode instead of typing a title. Continues the
visual language of issues #8 (`docs/mockups/issue-8/`) and #9
(`docs/mockups/issue-9/`) — same tokens, same iOS-native dark theme. **No new
palette entries are introduced.**

Open `mockup.html` in a browser. It contains five boards, all at a 390px viewport:

1. **Entry point** — scan button inside the search bar row (search page).
2. **Scanner view** — full-screen camera viewport, scan reticle, hint label.
3. **Permission denied** — explanation + manual-entry fallback.
4. **Manual ISBN entry** — numeric input with iOS-style keypad.
5. **Detection feedback** — brief confirmation before landing on the result.

---

## Design language

All tokens are inherited verbatim from issue #8 — see that README for the full
`@theme` table. No new colors, radii, or type sizes are introduced. Reused tokens:

| Token | Where it appears in this issue |
| ----- | ------------------------------ |
| `--color-background` | Search page canvas, state screens |
| `--color-surface-1` | Search field, permission icon badge, keypad track, detected-book card, manual-link chip |
| `--color-surface-2` | Keypad keys |
| `--color-separator` | Card borders, scan-CTA border, ISBN input border |
| `--color-primary` | Titles, entered ISBN digits, keypad digits |
| `--color-secondary` | Body copy, author line, delete key |
| `--color-tertiary` | Empty-state icon/copy, ISBN help text, "Opening book…" note |
| `--color-accent` | Scan glyph, search caret/focus ring, primary CTA, Cancel/Search actions, laser line |
| `--color-read` (`#30d158`) | Detection success check, detected-reticle corners, confirmed ISBN text |
| `--color-destructive` | Reserved for an invalid-ISBN error on screen 4 (not shown populated) |
| `--r-control` (10px) | Search field, scan-btn, ISBN input, primary CTA |
| `--r-card` (12px) | Detected-book preview card |
| `--r-pill` (999px) | Scan-CTA, "Enter ISBN manually" chip, permission icon badge |
| `--safe-bottom` (34px) | Keypad + scanner bottom cluster safe-area padding |

The scanner overlays (status bar glyphs, cancel, hint) render **white over the
live camera feed** rather than using text tokens, matching iOS camera UIs. The
`.over-camera` modifier on `.statusbar` handles this.

---

## Flow overview

```
Search page ──[tap scan glyph]──► Scanner view ──[barcode found]──► Detection feedback ──► Book detail / add sheet (issue #9)
     │                                  │
     │                                  ├─[permission denied]──► Permission denied ──► Manual ISBN entry
     │                                  └─[tap "Enter ISBN manually"]─────────────────► Manual ISBN entry
     └──[tap "Enter ISBN manually" chip is also reachable from the permission screen]
```

The detected ISBN is fed into the existing **ISBN book-search API** (added in
PR #61) — the scanner produces an ISBN string and reuses the same lookup path as
a typed `isbn:` query, landing on the book detail / add-sheet from issue #9.

---

## Component mapping

Maps each mockup element to its future component under `src/components/`.
No production code is written in this issue — implementation is a separate issue.

### Scan affordance → `src/components/books/BookSearch` (SearchBar trailing slot)

- Barcode glyph button, **44×44** touch target, `text-accent`, trailing the
  search field on the same row (`flex items-center gap-[10px]`).
- Placeholder copy updated to **"Title, author, or ISBN"** to advertise the path.
- Empty-state also offers a pill CTA: `inline-flex ... rounded-full bg-surface-1
  text-accent border border-separator px-5 min-h-[44px]`.
- Tapping either opens the scanner route/overlay.

### Scanner view → `src/components/books/BarcodeScanner` (new, `'use client'`)

- Full-bleed camera surface (`fixed inset-0`), reads frames via `getUserMedia`
  + a barcode decoder (`BarcodeDetector` where available, else a JS fallback).
- **Scrim + reticle:** dark scrim (`bg-background/60`) with a punched-out
  **300×180** scan window; white corner brackets (`border-4 rounded-lg`,
  `rounded-[8px]` corners), accent laser line. On a valid read the corners
  switch to `border-read` (green) — see `.reticle.detected`.
- **Hint label:** `text-white text-[15px]` centered below the window —
  *"Point at the barcode on the back cover"*.
- **Cancel:** top-left `X`, 44×44, white — closes the scanner and returns to search.
- **Manual fallback:** bottom translucent pill (`bg-surface-1/70 backdrop-blur`,
  `rounded-full`, `min-h-[44px]`) — *"Enter ISBN manually"*.
- All overlay controls sit above the feed with white glyphs.

### Permission denied → `BarcodeScanner` denied branch

- Centered state: 72px `rounded-full bg-surface-1` icon badge (camera-off glyph),
  title, explanatory copy, then two stacked actions:
  - **Primary** `bg-accent text-white rounded-[10px] min-h-[50px]` →
    *Enter ISBN manually* (opens screen 4).
  - **Secondary** `text-accent` link → *Try again* (re-invokes `getUserMedia`).
    A WebKit permission denial is generally not permanent, so a fresh prompt can
    surface in a later session. The explanatory copy still points the user to their
    device Settings for the permanently-denied case — there is no web API to
    deep-link into iOS Settings, so no such button is offered.
- Reuses the empty-state layout idiom from issue #9.

### Manual ISBN entry → `src/components/books/IsbnEntrySheet` (new, `'use client'`)

- Presented as a sheet (consistent with the add-book sheet in issue #9).
- Header: **Cancel** (left) · title *"Enter ISBN"* · **Search** (right,
  `font-semibold text-accent`), each ≥44px.
- Input: monospace, 20px, `letter-spacing`, `bg-surface-1 border border-separator
  rounded-[10px]`; accent focus ring (`.focused`). `inputMode="numeric"`.
- Help copy: where to find the ISBN; hyphens auto-formatted; digits-only.
- **Keypad:** iOS-style 3-column grid (`grid-cols-3 gap-2`), keys
  `bg-surface-2 rounded-lg min-h-[48px]`, blank slot + delete key. On real iOS
  the system numeric keyboard is used; the custom keypad is the visual reference
  for browsers without a good numeric keyboard.
- **Validation (not shown populated):** invalid checksum → inline
  `text-destructive` message under the input; the *Search* action stays disabled
  until 10/13 valid digits are present.

### Detection feedback → `BarcodeScanner` success state

- Brief (~800ms) confirmation before navigating: green check in a `bg-read`
  disc, *"Barcode detected"*, the formatted ISBN in `text-read`, and a small
  resolved-book preview card (`bg-surface-1 border border-separator
  rounded-[12px]`) once the API responds, with an *"Opening book…"* note.
- If the ISBN resolves to **no book**, fall through to search-no-results
  (issue #9) with the ISBN pre-filled instead of this success card.

---

## Accessibility & constraints

- Every interactive control is **≥44px** (scan button, cancel, manual pill,
  header actions, keypad keys are 48px, CTAs 50px).
- Dark theme is primary; light theme inverts via the shared `@media
  (prefers-color-scheme: light)` token swap. The camera overlay stays white-on-feed
  in both themes.
- Reticle corners use color **plus** shape; the success state uses a check icon
  **plus** green — never color alone to signal state.
- Reduced-motion: the laser sweep and check animation should respect
  `prefers-reduced-motion` at implementation (static line / instant check).

## Out of scope

- Barcode decoding library choice, camera stream lifecycle, and the ISBN
  checksum utility are implementation concerns for the follow-up build issue.
- No changes to the search results list, book detail, or add-sheet — those land
  from issue #9 and are reused verbatim.
