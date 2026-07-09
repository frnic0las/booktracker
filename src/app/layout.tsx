import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface SplashLink {
  rel: string;
  url: string;
  media: string;
}

// (width, height) are the LOGICAL sizes; ratio is the device pixel ratio.
const SPLASH_DEVICES: ReadonlyArray<readonly [number, number, number]> = [
  [375, 667, 2],
  [414, 896, 2],
  [375, 812, 3],
  [390, 844, 3],
  [393, 852, 3],
  [414, 736, 3],
  [414, 896, 3],
  [428, 926, 3],
  [430, 932, 3],
];

const SPLASH_LINKS: SplashLink[] = SPLASH_DEVICES.flatMap(([w, h, ratio]) =>
  (["dark", "light"] as const).map((theme) => ({
    rel: "apple-touch-startup-image",
    url: `/splash/splash-${w * ratio}x${h * ratio}-${theme}.png`,
    media:
      `(device-width: ${w}px) and (device-height: ${h}px) ` +
      `and (-webkit-device-pixel-ratio: ${ratio}) and (prefers-color-scheme: ${theme})`,
  })),
);

export const metadata: Metadata = {
  title: "BookTracker",
  description: "Track your reading, search books, and organise your personal library.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "BookTracker", statusBarStyle: "black-translucent" },
  // `appleWebApp.capable` only emits the standardised `mobile-web-app-capable`.
  // iOS before 16.4 reads standalone mode from the legacy name alone.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: SPLASH_LINKS,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
