import type { Reminder } from "./types";

const atLocalTime = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const initialReminders: Reminder[] = [
  {
    id: "morning-walk",
    title: "Take a quiet morning walk",
    notes: "Leave the phone in your pocket and take the riverside route.",
    dueAt: atLocalTime(0, 8, 30),
    completedAt: null,
    important: false,
    createdAt: atLocalTime(-3, 12),
  },
  {
    id: "weekly-plan",
    title: "Shape the week ahead",
    notes: "Choose the three outcomes that would make this week feel complete.",
    dueAt: atLocalTime(0, 10),
    completedAt: null,
    important: true,
    createdAt: atLocalTime(-2, 9),
  },
  {
    id: "call-mum",
    title: "Call Mum",
    notes: "Ask how the garden is doing.",
    dueAt: atLocalTime(0, 18),
    completedAt: null,
    important: false,
    createdAt: atLocalTime(-1, 16),
  },
  {
    id: "book-dentist",
    title: "Book a dentist appointment",
    notes: "",
    dueAt: atLocalTime(-1, 16),
    completedAt: null,
    important: false,
    createdAt: atLocalTime(-6, 11),
  },
  {
    id: "reading-list",
    title: "Add The Creative Act to reading list",
    notes: "Recommended by Maya.",
    dueAt: atLocalTime(3, 19),
    completedAt: null,
    important: false,
    createdAt: atLocalTime(-1, 20),
  },
  {
    id: "water-plants",
    title: "Water the plants",
    notes: "",
    dueAt: atLocalTime(0, 7),
    completedAt: atLocalTime(0, 7, 20),
    important: false,
    createdAt: atLocalTime(-4, 9),
  },
];
