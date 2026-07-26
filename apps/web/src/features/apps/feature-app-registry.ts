import { aiApp } from "@/features/ai/app";
import { calendarApp } from "@/features/calendar/app";
import { formula1App } from "@/features/formula1/app";
import { kanbanApp } from "@/features/kanban/app";
import { notesApp } from "@/features/notes/app";
import { remindersApp } from "@/features/reminders/app";

import type { FeatureAppDefinition } from "./model/types";

export const lifeverFeatureApps = [
  remindersApp,
  calendarApp,
  notesApp,
  kanbanApp,
  formula1App,
  aiApp,
] satisfies FeatureAppDefinition[];

export const lifeverFeatureAppsById = new Map(
  lifeverFeatureApps.map((app) => [app.id, app]),
);

export const isRegisteredFeatureAppId = (value: unknown): value is string =>
  typeof value === "string" && lifeverFeatureAppsById.has(value);
