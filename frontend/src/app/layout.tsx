import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { appConfig } from "@/shared/config/app.config";

import "./globals.css";

/**
 * `display: "swap"` renders fallback text immediately instead of blocking on
 * the webfont, and the CSS variable feeds the `--font-sans` design token.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: `${appConfig.name} — Management Portal`,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  // The admin portal is private; keep it out of every search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1a4fd6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
