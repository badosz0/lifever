"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const slides = [
  {
    id: "calendar",
    label: "Calendar",
    image: "/screenshots/calendar-week.jpg",
    alt: "Lifever Calendar showing a compact week of color-coded events",
  },
  {
    id: "reminders",
    label: "Reminders",
    image: "/screenshots/reminders-today.jpg",
    alt: "Lifever Reminders showing today's tasks",
  },
  {
    id: "notes",
    label: "Notes",
    image: "/screenshots/notes-markdown.jpg",
    alt: "Lifever Notes showing a selected Markdown note",
  },
  {
    id: "kanban",
    label: "Kanban",
    image: "/screenshots/kanban-board.jpg",
    alt: "Lifever Kanban showing a product launch project",
  },
] as const;

export function HeroShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  function selectSlide(index: number, focus = false) {
    setActiveIndex(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectSlide((index + 1) % slides.length, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectSlide((index - 1 + slides.length) % slides.length, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectSlide(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectSlide(slides.length - 1, true);
    }
  }

  return (
    <div
      className="hero-showcase"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-frame">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <Image
              key={slide.id}
              className="hero-image"
              data-active={active}
              src={slide.image}
              alt={active ? slide.alt : ""}
              aria-hidden={!active}
              width={1920}
              height={1080}
              loading={index === 0 ? "eager" : "lazy"}
              priority={index === 0}
              quality={92}
              sizes="(max-width: 720px) 100vw, 1180px"
            />
          );
        })}
      </div>

      <div className="hero-tabs" role="tablist" aria-label="Lifever apps">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            data-active={index === activeIndex}
            onClick={() => selectSlide(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span aria-hidden="true" />
            {slide.label}
          </button>
        ))}
      </div>
    </div>
  );
}
