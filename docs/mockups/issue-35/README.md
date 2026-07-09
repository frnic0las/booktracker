# Issue #35 — PWA app icon (mockups)

Design brief for the BookTracker app icon, its maskable variant, and the iOS splash screens.

Open `mockup.html` in a browser. Eight boards: the mark, the size ladder, three home-screen
contexts, the maskable safe zone, legibility stress tests, splash screens, the colour spec, and
the SVG source.

**No new design token is introduced.** Every colour below is an existing value from
`src/app/globals.css`, or a lift/shade of one for gradient shading.

---

## The mark

An open book seen head-on — two pages splaying up and away from a centre gutter — with an accent
bookmark ribbon rising out of the fold and hanging below it.

The ribbon is the idea. A book alone reads as *library*; a book with a bookmark in it reads as
*I am partway through this*, which is the thing BookTracker actually tracks. It also does double
duty as the spine, so the whole mark is three shapes: two pages and a ribbon. That is what lets
it hold at 29px.

The gutter is the **low** point of the top silhouette, not the high point — the pages tilt up and
outward, away from the fold, and the ribbon emerges from the valley between them. Inverting that
(pages tilting down from a peak) turns the mark into a hexagonal gem or a pair of wings: the
outline stops reading as a book at all. This was checked by rasterising, not by eye on the path
data.

Deliberately absent: page lines, text, a wordmark, serifs, an outline. Each is the first thing to
disintegrate under a 3× downscale, and none of them add meaning the silhouette does not already
carry.

### Why a dark tile rather than an accent-blue one

BookTracker is a dark-first, iOS-native surface — `#0a0a0b` everywhere. Painting the tile accent
blue would be the only place in the product where `--accent` behaves as a *background* rather
than as *the colour of things you touch*, and it would put the app in a crowd: the iOS home
screen is already full of blue tiles. The near-black field with a faint accent bloom keeps the
blue doing one job.

The risk of a dark icon is that it dissolves into a dark wallpaper. It does not here: the pages
are near-white (`#ffffff → #cfcfd6`) and span 62% of the canvas width. The tile *edge* may blur
into the wallpaper; the *mark* never does. Board 3 shows it on dark, light, and loud wallpapers.

---

## Files in this folder

| File | Role |
| --- | --- |
| `mockup.html` | Preview board. Renders the SVG source at every size and mask. |
| `icon.svg` | **Source of truth.** 512×512. Exports `apple-touch-icon`, `icon-192`, `icon-512`. |
| `icon-maskable.svg` | Same, glyph scaled to 90%. Exports `icon-maskable-512`. |
| `splash-glyph.svg` | Glyph only, transparent, white pages. Composited onto dark splashes. |
| `splash-glyph-light.svg` | Glyph only, transparent, ink pages. Composited onto light splashes. |

---

## Assets to produce

All go in `public/icons/` except `apple-touch-icon.png`, which iOS also probes at the web root.

### Icons

| File | Size | Notes |
| --- | --- | --- |
| `apple-touch-icon.png` | 180×180 | iOS home screen. **Square — no rounded corners.** |
| `icon-192.png` | 192×192 | PWA manifest |
| `icon-512.png` | 512×512 | PWA manifest / install prompt |
| `icon-maskable-512.png` | 512×512 | Android adaptive. `purpose: "maskable"` |
| `favicon.ico` | 32×32 | Browser tab (optional but cheap — `icon.svg` downscales cleanly) |

iOS applies the squircle mask itself. Baking rounded corners into the PNG produces a tile with a
visible dark halo inside the mask. The exported file must be a flat square.

### Splash screens

18 files: 9 sizes × `{dark, light}`. Naming: `splash-<W>x<H>-<theme>.png`.

| Portrait | Logical | Devices |
| --- | --- | --- |
| 750×1334 | 375×667 @2x | SE 2/3, 6–8 |
| 828×1792 | 414×896 @2x | XR, 11 |
| 1125×2436 | 375×812 @3x | X, XS, 11 Pro |
| 1170×2532 | 390×844 @3x | 12, 13, 14 |
| 1179×2556 | 393×852 @3x | 14 Pro, 15, 16 |
| 1242×2208 | 414×736 @3x | 6+ – 8+ |
| 1242×2688 | 414×896 @3x | XS Max, 11 Pro Max |
| 1284×2778 | 428×926 @3x | 12/13 Pro Max, 14 Plus |
| 1290×2796 | 430×932 @3x | 14/15 Pro Max, 16 Plus |

Splash = **glyph only** on a solid field. No tile, no rounded corners, no wordmark. The glyph box
is 45% of the image width, centred horizontally, and nudged 4% of the height above the geometric
centre so it reads as optically centred.

The background must be the same colour as the app shell (`--background`), or the launch flashes
between the splash and the first paint.

**The light splash inverts the glyph.** Pages become `#1c1c1e`, ribbon becomes `#007aff` — the
light-mode values of `--primary` and `--accent`. Reusing the dark glyph would put white pages on
a white field: an empty screen with a floating blue ribbon.

---

## Colour spec

| Element | Value | Relation to `globals.css` |
| --- | --- | --- |
| Tile field, top | `#17171c` | lift of `--background` |
| Tile field, bottom | `#0a0a0b` | `--background` |
| Accent bloom | `#0a84ff` @ 22% → 0%, radial from `(256, 188)` r=286 | `--accent` |
| Pages, top | `#ffffff` | lift of `--primary` |
| Pages, bottom | `#cfcfd6` | shade of `--primary` |
| Ribbon, top | `#4ba7ff` | lift of `--accent` |
| Ribbon, bottom | `#0a6fe0` | ≈ `--accent-pressed` |
| Splash dark — background | `#0a0a0b` | `--background` (dark) |
| Splash light — background | `#ffffff` | `--background` (light) |
| Splash light — pages | `#1c1c1e` | `--primary` (light) |
| Splash light — ribbon | `#007aff` | `--accent` (light) |

Geometry: canvas `512×512`; glyph bounding box `316×222`, centred on `(256, 256)`. 316/512 ≈ 62%
of the canvas width, which sits inside Apple's optical grid for a wide mark.

---

## Maskable variant — deviation from the brief

The issue says the maskable variant "needs a solid background that extends to edges (typically
the accent colour)". The first half is a requirement; the second half should not be followed here.

`icon.svg` **already** has a solid field running to all four edges. So the maskable variant needs
no new background — swapping in accent blue would ship two visually different icons for the same
app depending on which platform installed it.

The only difference between `icon-512.png` and `icon-maskable-512.png` is the glyph scale:

```
transform="translate(256 256) scale(0.9) translate(-256 -256)"
```

At 90% no point of the glyph lies more than ~166px from the centre — the worst case is a page's
outer-top corner — comfortably inside the 204.8px radius of the 80% safe circle. Board 4 overlays
both the safe circle and the safe square.

90%, not 78%: the mark is wide and short (316×222), so it already very nearly clears the safe
circle at full size. Shrinking it further would leave the Android icon looking stranded in its
own tile next to the iOS one.

---

## Export

No design tool needed — the SVGs are the source. `sharp` rasterises them.

```bash
pnpm dlx sharp-cli --version   # or: pnpm add -D sharp   (dev-only, not a runtime dep)
```

Save as `scripts/generate-icons.mjs`, run with `node scripts/generate-icons.mjs`:

```js
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'docs/mockups/issue-35';
const OUT = 'public/icons';

// SVG sources are authored at 512×512, so render density must scale with the
// target size or sharp rasterises at 512 and upscales the bitmap.
const density = (size) => Math.ceil((72 * size) / 512);
const render = (file, size) =>
  sharp(`${SRC}/${file}`, { density: density(size) })
    .resize(size, size)
    .png({ compressionLevel: 9 });

const ICONS = [
  ['icon.svg', 180, 'public/apple-touch-icon.png'],
  ['icon.svg', 192, `${OUT}/icon-192.png`],
  ['icon.svg', 512, `${OUT}/icon-512.png`],
  ['icon-maskable.svg', 512, `${OUT}/icon-maskable-512.png`],
];

const SPLASH_SIZES = [
  [750, 1334], [828, 1792], [1125, 2436], [1170, 2532], [1179, 2556],
  [1242, 2208], [1242, 2688], [1284, 2778], [1290, 2796],
];

const THEMES = {
  dark: { glyph: 'splash-glyph.svg', bg: '#0a0a0b' },
  light: { glyph: 'splash-glyph-light.svg', bg: '#ffffff' },
};

await mkdir(OUT, { recursive: true });

for (const [src, size, out] of ICONS) {
  await render(src, size).toFile(out);
}

for (const [w, h] of SPLASH_SIZES) {
  for (const [theme, { glyph, bg }] of Object.entries(THEMES)) {
    const box = Math.round(w * 0.45);
    const layer = await render(glyph, box).toBuffer();
    await sharp({ create: { width: w, height: h, channels: 4, background: bg } })
      .composite([
        {
          input: layer,
          left: Math.round((w - box) / 2),
          top: Math.round((h - box) / 2 - h * 0.04),
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(`${OUT}/splash-${w}x${h}-${theme}.png`);
  }
}
```

The generated PNGs are committed — Vercel does not run this script at build time.

---

## Wiring it up

### `public/manifest.json`

```json
{
  "name": "BookTracker",
  "short_name": "BookTracker",
  "description": "Track your reading, search books, organise your library.",
  "start_url": "/novels",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0b",
  "theme_color": "#0a0a0b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`start_url` is `/novels`, not `/` — `src/app/page.tsx` only redirects there, and a launched PWA
should not pay a redirect on every cold start.

`background_color` matches `--background` (dark) because the manifest has no light variant; the
per-device `apple-touch-startup-image` links below carry the light splashes.

### `src/app/layout.tsx`

```ts
export const metadata: Metadata = {
  title: 'BookTracker',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'BookTracker', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: SPLASH_LINKS,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};
```

Splash links are `rel="apple-touch-startup-image"` with a media query per device *and* per theme.
Build them from the logical sizes rather than writing 18 strings by hand:

```ts
// (width, height) are the LOGICAL sizes; ratio is the device pixel ratio.
const SPLASH_DEVICES = [
  [375, 667, 2], [414, 896, 2], [375, 812, 3], [390, 844, 3], [393, 852, 3],
  [414, 736, 3], [414, 896, 3], [428, 926, 3], [430, 932, 3],
] as const;

const SPLASH_LINKS = SPLASH_DEVICES.flatMap(([w, h, ratio]) =>
  (['dark', 'light'] as const).map((theme) => ({
    rel: 'apple-touch-startup-image',
    url: `/icons/splash-${w * ratio}x${h * ratio}-${theme}.png`,
    media:
      `(device-width: ${w}px) and (device-height: ${h}px) ` +
      `and (-webkit-device-pixel-ratio: ${ratio}) and (prefers-color-scheme: ${theme})`,
  })),
);
```

Note `414×896` appears twice — once at @2x (XR, 11) and once at @3x (XS Max, 11 Pro Max). The
`-webkit-device-pixel-ratio` clause is what separates them, so it is not optional.

---

## Checklist for the implementation issue

- [ ] `sharp` added as a **devDependency** only — it must not ship to the Vercel runtime
- [ ] Generated PNGs committed under `public/icons/` + `public/apple-touch-icon.png`
- [ ] `public/manifest.json` created
- [ ] `metadata` / `viewport` exports wired in `src/app/layout.tsx`
- [ ] Next.js default SVGs (`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`)
      deleted — they are unused scaffolding, and the issue's premise that `public/icons/` already
      holds Next.js defaults is out of date
- [ ] Verified on a real iPhone: Share → Add to Home Screen, then cold-launch and watch the splash
- [ ] Verified in Chrome DevTools → Application → Manifest (maskable preview, install prompt)

## Notes

- The issue states `public/icons/` and `public/manifest.json` "exist but contain only Next.js
  defaults". Neither exists on `main` as of this branch — `public/` holds five stock SVGs and
  nothing else. The implementation issue creates both from scratch.
- The tokens used here were read from the `@theme` block in `src/app/globals.css`, which is the
  design system of record. (An earlier draft of this note flagged a dead `docs/DESIGN_SYSTEM.md`
  reference in `CLAUDE.md`; that reference was removed in #48.)
- Apple no longer requires landscape splash screens for a portrait-locked PWA
  (`"orientation": "portrait"`), so none are specified.
