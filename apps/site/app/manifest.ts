import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lifever",
    short_name: "Lifever",
    description:
      "A calm home for reminders, calendar, notes, projects, and Formula 1.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007aff",
    icons: [
      {
        src: "/lifever-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
