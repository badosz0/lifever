import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lifever",
    short_name: "Lifever",
    description:
      "A calm, synced home for reminders, calendars, notes, projects, and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#fefefd",
    icons: [
      {
        src: "/lifever-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
