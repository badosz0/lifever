"use client";

import {
  CalendarDays,
  ChartNoAxesCombined,
  Columns3,
  FileText,
  FlagTriangleRight,
  House,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type Product = {
  id: string;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  accent: string;
  points: string[];
  Icon: LucideIcon;
};

const products: Product[] = [
  {
    id: "home",
    label: "Home",
    shortLabel: "Home",
    title: "The useful parts, already together.",
    description:
      "Home brings the next useful piece from every enabled app into one rearrangeable view. Keep only the summaries you want.",
    image: "/screenshots/home-overview.jpg",
    alt: "Lifever Home with reminders, calendar, notes, and Kanban summaries",
    accent: "#007aff",
    points: ["Reorder summaries", "Choose what appears", "Open any app"],
    Icon: House,
  },
  {
    id: "calendar",
    label: "Calendar",
    shortLabel: "Calendar",
    title: "See the whole day. Move it in seconds.",
    description:
      "Create and resize by dragging, span multiple days, use categories, and move naturally between day, week, month, and year.",
    image: "/screenshots/calendar-week.jpg",
    alt: "Lifever calendar showing a compact week with color-coded events",
    accent: "#007aff",
    points: ["Compact full day", "Day to year views", "Event alerts"],
    Icon: CalendarDays,
  },
  {
    id: "reminders",
    label: "Reminders",
    shortLabel: "Reminders",
    title: "Capture quickly. Organize when it matters.",
    description:
      "Natural scheduling, priorities, notes, sounds, and Undo keep small tasks fast without flattening the details.",
    image: "/screenshots/reminders-today.jpg",
    alt: "Lifever reminders Today list",
    accent: "#ff3b30",
    points: ["Quick capture", "Natural scheduling", "Priorities and sound"],
    Icon: ListChecks,
  },
  {
    id: "notes",
    label: "Notes",
    shortLabel: "Notes",
    title: "A quiet place to think in Markdown.",
    description:
      "Write, preview, pin, categorize, and find notes in a clean list without a formatting toolbar getting in the way.",
    image: "/screenshots/notes-markdown.jpg",
    alt: "Lifever Markdown note with live preview",
    accent: "#ff9500",
    points: ["Markdown preview", "Pins and categories", "Fast search"],
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
    points: ["Multiple projects", "Custom properties", "Fluid drag and drop"],
    Icon: Columns3,
  },
  {
    id: "ai",
    label: "AI",
    shortLabel: "AI",
    title: "Know what your Codex work is using.",
    description:
      "See account limits, daily token volume, and model breakdowns from your local Codex history in one restrained dashboard.",
    image: "/screenshots/ai-usage.jpg",
    alt: "Lifever AI dashboard showing Codex limits and token history",
    accent: "#5856d6",
    points: ["Account limits", "Token history", "Model breakdown"],
    Icon: ChartNoAxesCombined,
  },
  {
    id: "formula-1",
    label: "Formula 1",
    shortLabel: "F1",
    title: "Race weekends in your local time.",
    description:
      "See the next session first, follow live countdowns, and browse every race without translating schedules in your head.",
    image: "/screenshots/formula-1.jpg",
    alt: "Lifever Formula 1 weekend overview",
    accent: "#ff2d55",
    points: ["Local session times", "Live countdowns", "Race details"],
    Icon: FlagTriangleRight,
  },
];

export function ProductShowcase() {
  const [activeId, setActiveId] = useState(products[0].id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeProduct =
    products.find((product) => product.id === activeId) ?? products[0];

  function selectTab(index: number) {
    const product = products[index];
    if (!product) return;
    setActiveId(product.id);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab((index + 1) % products.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab((index - 1 + products.length) % products.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(products.length - 1);
    }
  }

  return (
    <div className="product-showcase">
      <div className="product-tabs" role="tablist" aria-label="Lifever apps">
        {products.map(({ id, label, shortLabel, Icon, accent }, index) => {
          const active = id === activeProduct.id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="product-panel"
              id={`product-tab-${id}`}
              tabIndex={active ? 0 : -1}
              className="product-tab"
              data-active={active}
              onClick={() => setActiveId(id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
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
        aria-labelledby={`product-tab-${activeProduct.id}`}
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
          <div>
            <p>{activeProduct.description}</p>
            <ul className="product-points">
              {activeProduct.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="product-image-shell">
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
