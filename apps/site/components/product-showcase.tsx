"use client";

import {
  CalendarDays,
  Columns3,
  FileText,
  FlagTriangleRight,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Product = {
  id: string;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  accent: string;
  Icon: LucideIcon;
};

const products: Product[] = [
  {
    id: "calendar",
    label: "Calendar",
    shortLabel: "Calendar",
    title: "See the whole day. Move it in seconds.",
    description:
      "Create by dragging, resize in place, span multiple days, and move naturally between day, week, month, and year.",
    image: "/screenshots/calendar-week.jpg",
    alt: "Lifever calendar showing a compact week with color-coded events",
    accent: "#007aff",
    Icon: CalendarDays,
  },
  {
    id: "reminders",
    label: "Reminders",
    shortLabel: "Reminders",
    title: "Capture quickly. Organize when it matters.",
    description:
      "Natural scheduling, categories, priorities, notes, sounds, and Undo keep small tasks fast without flattening the details.",
    image: "/screenshots/reminders-today.jpg",
    alt: "Lifever reminders Today list",
    accent: "#ff3b30",
    Icon: ListChecks,
  },
  {
    id: "notes",
    label: "Notes",
    shortLabel: "Notes",
    title: "A quiet place to think in Markdown.",
    description:
      "Write, preview, pin, categorize, and find notes without a formatting toolbar getting in the way.",
    image: "/screenshots/notes-markdown.jpg",
    alt: "Lifever Markdown note with live preview",
    accent: "#ff9500",
    Icon: FileText,
  },
  {
    id: "kanban",
    label: "Kanban",
    shortLabel: "Kanban",
    title: "Projects that stay clear as they grow.",
    description:
      "Separate projects, custom properties, labels, limits, and fluid drag and drop—structured like a workspace, not a spreadsheet.",
    image: "/screenshots/kanban-board.jpg",
    alt: "Lifever Kanban board with project cards and labels",
    accent: "#af52de",
    Icon: Columns3,
  },
  {
    id: "formula-1",
    label: "Formula 1",
    shortLabel: "F1",
    title: "Race weekends in your local time.",
    description:
      "See the next session first, follow live countdowns, and keep the championship picture close without hunting through schedules.",
    image: "/screenshots/formula-1.jpg",
    alt: "Lifever Formula 1 weekend overview",
    accent: "#ff2d55",
    Icon: FlagTriangleRight,
  },
];

export function ProductShowcase() {
  const [activeId, setActiveId] = useState(products[0].id);
  const activeProduct =
    products.find((product) => product.id === activeId) ?? products[0];

  return (
    <div className="product-showcase">
      <div className="product-tabs" role="tablist" aria-label="Lifever apps">
        {products.map(({ id, label, shortLabel, Icon, accent }) => {
          const active = id === activeProduct.id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="product-panel"
              className="product-tab"
              data-active={active}
              onClick={() => setActiveId(id)}
              style={{ "--app-accent": accent } as React.CSSProperties}
            >
              <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
              <span className="label-full">{label}</span>
              <span className="label-short">{shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        className="product-panel"
        id="product-panel"
        role="tabpanel"
        style={{ "--app-accent": activeProduct.accent } as React.CSSProperties}
      >
        <div className="product-copy">
          <div className="product-title">
            <span className="product-kicker">
              <activeProduct.Icon size={16} aria-hidden="true" />
              {activeProduct.label}
            </span>
            <h3>{activeProduct.title}</h3>
          </div>
          <p>{activeProduct.description}</p>
        </div>
        <div className="product-image-shell">
          <div className="window-rail" aria-hidden="true">
            <span />
            <span />
            <span />
            <small>Lifever</small>
          </div>
          <Image
            key={activeProduct.id}
            className="product-image"
            src={activeProduct.image}
            alt={activeProduct.alt}
            width={1920}
            height={1080}
            quality={92}
            sizes="(max-width: 720px) 92vw, 1080px"
          />
        </div>
      </div>
    </div>
  );
}
