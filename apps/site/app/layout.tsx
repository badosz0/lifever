import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const siteUrl = "https://www.lifever.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lifever — Your day, together.",
    template: "%s · Lifever",
  },
  description:
    "A calm home for reminders, calendar, notes, projects, Formula 1, and AI usage. Local first, optionally synced, and native on macOS and Windows.",
  applicationName: "Lifever",
  keywords: [
    "reminders",
    "calendar",
    "notes",
    "kanban",
    "AI usage",
    "macOS",
    "Windows",
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
    title: "Lifever — Your day, together.",
    description:
      "One calm home for reminders, plans, notes, projects, and the things you follow.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Lifever — Your day, together.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lifever — Your day, together.",
    description:
      "One calm home for reminders, plans, notes, projects, and the things you follow.",
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
