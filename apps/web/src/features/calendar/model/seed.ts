import {
  addDays,
  addMinutes,
  daysBetween,
  setCalendarTime,
  startOfWeek,
  subDays,
} from "../lib/dates";
import { categoryIdForLegacyColor } from "../lib/categories";
import type { CalendarEvent } from "./types";

const makeEvent = (
  id: string,
  title: string,
  date: Date,
  startHour: number,
  startMinute: number,
  durationMinutes: number,
  legacyColor: "blue" | "violet" | "orange" | "green" | "pink" | "red",
  location = "",
  notes = "",
): CalendarEvent => {
  const start = setCalendarTime(date, startHour, startMinute);
  const end = addMinutes(start, durationMinutes);
  return {
    id,
    title,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    categoryId: categoryIdForLegacyColor(legacyColor),
    location,
    notes,
    createdAt: subDays(start, 1).toISOString(),
  };
};

const today = new Date();
const monday = startOfWeek(today);
const todayIndex = daysBetween(today, monday);

export const initialCalendarEvents: CalendarEvent[] = [
  makeEvent(
    "deep-work",
    "Deep work",
    today,
    9,
    0,
    90,
    "blue",
    "Studio",
    "Protect this time for the hardest problem of the day.",
  ),
  makeEvent(
    "design-review",
    "Design review",
    today,
    11,
    15,
    60,
    "violet",
    "Meet room",
    "Calendar polish and interaction review.",
  ),
  makeEvent("lunch-ana", "Lunch with Ana", today, 13, 15, 60, "orange", "Bar Pacyfik"),
  makeEvent("evening-run", "Evening run", today, 18, 30, 60, "green", "Riverside"),
  makeEvent(
    "weekly-planning",
    "Weekly planning",
    addDays(monday, Math.max(0, todayIndex - 1)),
    8,
    30,
    45,
    "pink",
  ),
  makeEvent(
    "project-kickoff",
    "Project kickoff",
    addDays(today, 1),
    10,
    0,
    75,
    "red",
    "Video call",
  ),
  makeEvent("dentist", "Dentist", addDays(today, 2), 15, 30, 45, "blue", "Mokotów"),
];
