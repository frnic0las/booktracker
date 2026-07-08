# Issue #26 — Login page (mockups)

Design brief for the **login page** — the single public screen of the app,
gating all `/(app)/` routes. Continues the visual language established in issue
#8 (`docs/mockups/issue-8/`) — same tokens, same iOS-native dark theme. Nothing
new is added to the palette; the only token beyond issue #8 is `--color-destructive`,
already declared in `src/app/globals.css`.

> **Folder note:** the issue body references `docs/mockups/issue-16/`, but that is
> a typo (issue #26 is the login-page design). Per the `fix-issue` skill and the
> `ui-designer` agent, all artifacts for this issue live in `docs/mockups/issue-26/`.

Open `mockup.html` in a browser. It contains three boards, all at a 390px viewport:

1. **Login — default** (idle, empty fields with placeholders)
2. **Login — filled & focused** (accent focus ring on the password field, CTA pressed)
3. **Login — invalid credentials** (destructive field border + inline error banner)

---

## Design language (dark theme, primary)

Mobile-only, iOS-native. Designed for 375–430px; boards shown at **390px**.
Minimal, vertically centered layout — no bottom nav (this screen is pre-auth).
Dark mode is the primary theme; light mode reuses the same token names with the
inverted values already defined in `globals.css`.

### Tokens used (all pre-existing — see issue #8 for the full table)

| `@theme` token (CSS var) | Dark value | Tailwind class                | Usage on this screen                     |
| ------------------------ | ---------- | ----------------------------- | ---------------------------------------- |
| `--color-background`     | `#0a0a0b`  | `bg-background`               | App canvas                               |
| `--color-surface-1`      | `#161618`  | `bg-surface-1`                | Input field (idle)                       |
| `--color-surface-2`      | `#202024`  | `bg-surface-2`                | Input field (focused), logo tile         |
| `--color-separator`      | `#2a2a2e`  | `border-separator`            | Input borders, logo tile border          |
| `--color-primary`        | `#f5f5f7`  | `text-primary`                | App title, entered text                  |
| `--color-secondary`      | `#a1a1aa`  | `text-secondary`              | Field labels, tagline                    |
| `--color-tertiary`       | `#6b6b73`  | `text-tertiary`               | Placeholder text                         |
| `--color-accent`         | `#0a84ff`  | `bg-accent` / `border-accent` | "Log In" CTA, focus ring, logo glyph      |
| `--color-destructive`    | `#ff453a`  | `text-destructive` / `border-destructive` | Error banner + invalid field border |

### Radius / spacing tokens

| Token         | Value   | Applied to                              |
| ------------- | ------- | --------------------------------------- |
| `--r-control` | `10px`  | `rounded-[10px]` — inputs, CTA button   |
| Logo tile     | `20px`  | `rounded-[20px]` — 72px brand tile       |
| Screen inset  | `28px`  | `px-7` — form horizontal padding         |
| Field gap     | `12px`  | `gap-3` — between fields                  |
| Input height  | `50px`  | `h-[50px]` — inputs & CTA (≥44px iOS min) |
| Safe bottom   | `34px`  | `pb-[env(safe-area-inset-bottom)]`       |

### Typography

| Element        | Size / weight | Tailwind                                    |
| -------------- | ------------- | ------------------------------------------- |
| App title      | 28px / 800    | `text-[28px] font-extrabold tracking-tight` |
| Tagline        | 15px / 400    | `text-[15px] text-secondary`                |
| Field label    | 13px / 600    | `text-[13px] font-semibold text-secondary`  |
| Input text     | 16px / 400    | `text-base` — **16px min avoids iOS zoom-on-focus** |
| CTA label      | 17px / 600    | `text-[17px] font-semibold`                 |
| Error message  | 13px / 600    | `text-[13px] font-semibold text-destructive`|

---

## Component mapping

Maps each mockup element to its future component/route. No production code is
written in this issue — implementation is a separate issue.

### Route → `src/app/(auth)/login/page.tsx`

- The only screen in the `(auth)` route group — public, no `BottomNav`, no app shell.
- Server Component page; the form is a small `'use client'` island wired to the
  Auth.js v5 credentials `signIn` Server Action.
- Vertically centered content (`flex flex-col justify-center`) within the viewport.

### Brand block → inline in the page (not a shared component)

- 72px `rounded-[20px]` gradient tile (`from-surface-2 to-surface-1 border-separator`)
  with the two-page book glyph in `text-accent` — reuses the app's book icon.
- App title `BookTracker` (28px / 800) + one-line tagline in `text-secondary`.

### Form → `src/components/ui/` (reuses shared primitives)

| Visual              | Component / class                                                             |
| ------------------- | ---------------------------------------------------------------------------- |
| Email input         | `<input type="email" autocomplete="email" inputmode="email">` on `Input`      |
| Password input      | `<input type="password" autocomplete="current-password">` on `Input`          |
| Input (idle)        | `bg-surface-1 border border-separator rounded-[10px] h-[50px] px-4 text-base` |
| Input (focused)     | `focus:bg-surface-2 focus:border-accent focus:ring-3 focus:ring-accent/25`    |
| Input (invalid)     | `border-destructive ring-3 ring-destructive/20` (applied when error present)  |
| "Log In" CTA        | `Button` primary → `h-[50px] bg-accent text-white rounded-[10px] text-[17px] font-semibold` |
| CTA pressed         | `active:bg-[--color-accent-pressed]` (≈ `#0060df`)                             |

- If a shared `Input` / `Button` already exists under `src/components/ui/`, reuse
  it and only add the states above; otherwise these are the seed classes.

### Error state → inline error banner

- On `signIn` failure (`CredentialsSignin`), render a single generic message:
  **"Invalid email or password."** — never reveal which field is wrong (avoids
  user-enumeration). Icon (16px circle-exclamation) + text in `text-destructive`,
  placed between the password field and the CTA.
- The failing field(s) also take the `border-destructive` treatment.
- Wire `aria-invalid` on the inputs and `aria-describedby` → the banner for a11y.

---

## States covered

- [x] Default / idle — empty fields, placeholders, ready CTA
- [x] Filled & focused — accent focus ring on active field, pressed CTA
- [x] Invalid credentials — destructive field border + inline error banner
- [x] App title / logo at top — centered brand block

## Notes for implementation

- Inputs use `16px` text to prevent iOS Safari zoom-on-focus.
- Touch targets are `50px` tall (≥44px iOS minimum).
- Keep the error message generic (no field-level "email not found") to avoid
  account enumeration — a single "Invalid email or password." for any auth failure.
- No light-mode board is drawn: light mode reuses the same token names with the
  inverted surface/text values already in `globals.css`.
- Sample credentials shown are illustrative only; the app never ships placeholder data.
