export type CalendarCategory = {
  id: string;
  name: string;
  color: string;
  position: number;
  calendarId: string;
  createdAt: string;
};

export type CalendarSourceKind = "lifever" | "google" | "app";

export type CalendarCollection = {
  id: string;
  name: string;
  color: string;
  position: number;
  visible: boolean;
  writable: boolean;
  source: CalendarSourceKind;
  appId?: string;
  primary?: boolean;
  sourceColor?: string;
  createdAt?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  categoryId: string;
  calendarId: string;
  calendarName?: string;
  color?: string | null;
  location: string;
  notes: string;
  alertsEnabled: boolean;
  allDay: boolean;
  source: CalendarSourceKind;
  readOnly: boolean;
  externalId?: string;
  htmlLink?: string | null;
  createdAt: string;
};

export type NewCalendarEvent = Pick<
  CalendarEvent,
  | "title"
  | "startAt"
  | "endAt"
  | "categoryId"
  | "calendarId"
  | "location"
  | "notes"
  | "color"
  | "alertsEnabled"
  | "allDay"
>;

export type CalendarEventPreview = {
  calendarId: string;
  categoryId: string;
  color?: string | null;
  end: Date;
  start: Date;
  title: string;
};

export type CalendarViewMode = "year" | "month" | "week" | "day";
