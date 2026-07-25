export type CalendarCategory = {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  categoryId: string;
  location: string;
  notes: string;
  alertsEnabled: boolean;
  createdAt: string;
};

export type NewCalendarEvent = Pick<
  CalendarEvent,
  | "title"
  | "startAt"
  | "endAt"
  | "categoryId"
  | "location"
  | "notes"
  | "alertsEnabled"
>;

export type CalendarEventPreview = {
  categoryId: string;
  end: Date;
  start: Date;
  title: string;
};

export type CalendarViewMode = "year" | "month" | "week" | "day";
