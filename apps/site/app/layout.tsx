import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const siteUrl = "https://www.lifever.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lifever — Life, together.",
    template: "%s · Lifever",
  },
  description:
    "A calm home for reminders, calendar, notes, projects, and Formula 1. Local first, optionally synced, and native on macOS.",
  applicationName: "Lifever",
  keywords: [
    "reminders",
    "calendar",
    "notes",
    "kanban",
    "macOS",
    "productivity",
    "local first",
  ],
  authors: [{ name: "Lifever" }],
  creator: "Lifever",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Lifever",
    title: "Lifever — Life, together.",
    description:
      "Reminders, calendar, notes, projects, and Formula 1 in one calm place.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Lifever — Life, together.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lifever — Life, together.",
    description:
      "Reminders, calendar, notes, projects, and Formula 1 in one calm place.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/lifever-logo.png",
    apple: "/lifever-logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fefefd",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
