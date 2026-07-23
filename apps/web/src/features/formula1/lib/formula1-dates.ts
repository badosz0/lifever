import { differenceInSeconds } from "date-fns";

import type {
  Formula1Race,
  Formula1Session,
} from "@/features/formula1/model/types";

const FALLBACK_RACE_HOUR_UTC = 12;
const RACE_DURATION_MS = 4 * 60 * 60 * 1_000;
const WEEKEND_LEAD_MS = 12 * 60 * 60 * 1_000;

export const raceStartDate = (race: Formula1Race) =>
  race.startsAt
    ? new Date(race.startsAt)
    : new Date(`${race.date}T${String(FALLBACK_RACE_HOUR_UTC).padStart(2, "0")}:00:00Z`);

export const getRaceState = (
  race: Formula1Race,
  now: Date,
): "completed" | "race-week" | "upcoming" => {
  const raceStart = raceStartDate(race);
  if (now.getTime() > raceStart.getTime() + RACE_DURATION_MS) {
    return "completed";
  }
  const firstSession = race.sessions.find((session) => session.startsAt);
  if (
    firstSession?.startsAt &&
    now.getTime() >= new Date(firstSession.startsAt).getTime() - WEEKEND_LEAD_MS
  ) {
    return "race-week";
  }
  return "upcoming";
};

export const getSpotlightRace = (races: Formula1Race[], now: Date) =>
  races.find((race) => getRaceState(race, now) !== "completed") ??
  races.at(-1) ??
  null;

export const getNextSession = (
  race: Formula1Race,
  now: Date,
): Formula1Session | null =>
  race.sessions.find(
    (session) =>
      session.startsAt &&
      new Date(session.startsAt).getTime() + 90 * 60 * 1_000 >= now.getTime(),
  ) ?? null;

export const formatCountdown = (target: Date, now: Date) => {
  const totalSeconds = Math.max(0, differenceInSeconds(target, now));
  if (totalSeconds < 1) return "Now";

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${minutes}m ${pad(seconds)}s`;
};

export const getSessionState = (
  session: Formula1Session,
  now: Date,
): "past" | "next" | "future" | "tbc" => {
  if (!session.startsAt) return "tbc";
  const start = new Date(session.startsAt).getTime();
  if (start + 90 * 60 * 1_000 < now.getTime()) return "past";
  if (start <= now.getTime() + 90 * 60 * 1_000) return "next";
  return "future";
};
