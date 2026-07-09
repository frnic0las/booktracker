import { mkdir } from "node:fs/promises";

import sharp from "sharp";

const SRC = "docs/mockups/issue-35";
const ICONS_OUT = "public/icons";
const SPLASH_OUT = "public/splash";

// SVG sources are authored at 512x512, so render density must scale with the
// target size or sharp rasterises at 512 and upscales the bitmap.
const density = (size: number): number => Math.ceil((72 * size) / 512);

const render = (file: string, size: number): ReturnType<typeof sharp> =>
  sharp(`${SRC}/${file}`, { density: density(size) })
    .resize(size, size)
    .png({ compressionLevel: 9 });

const ICONS: ReadonlyArray<readonly [string, number, string]> = [
  ["icon.svg", 180, `${ICONS_OUT}/apple-touch-icon.png`],
  ["icon.svg", 192, `${ICONS_OUT}/icon-192.png`],
  ["icon.svg", 512, `${ICONS_OUT}/icon-512.png`],
  ["icon-maskable.svg", 512, `${ICONS_OUT}/icon-maskable-512.png`],
];

const SPLASH_SIZES: ReadonlyArray<readonly [number, number]> = [
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1242, 2208],
  [1242, 2688],
  [1284, 2778],
  [1290, 2796],
];

interface SplashTheme {
  glyph: string;
  bg: string;
}

const THEMES: Record<"dark" | "light", SplashTheme> = {
  dark: { glyph: "splash-glyph.svg", bg: "#0a0a0b" },
  light: { glyph: "splash-glyph-light.svg", bg: "#ffffff" },
};

async function main(): Promise<void> {
  await mkdir(ICONS_OUT, { recursive: true });
  await mkdir(SPLASH_OUT, { recursive: true });

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
        .toFile(`${SPLASH_OUT}/splash-${w}x${h}-${theme}.png`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
