import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = productionHost
  ? `https://${productionHost}`
  : "https://lifever.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lifever — Life, together",
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
    title: "Lifever — Life, together",
    description:
      "Reminders, calendar, notes, projects, and Formula 1 in one calm place.",
    images: [
      {
        url: "/screenshots/calendar-week.jpg",
        width: 1280,
        height: 720,
        alt: "Lifever week calendar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lifever — Life, together",
    description:
      "Reminders, calendar, notes, projects, and Formula 1 in one calm place.",
    images: ["/screenshots/calendar-week.jpg"],
  },
  icons: {
    icon: "/lifever-logo.png",
    apple: "/lifever-logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
