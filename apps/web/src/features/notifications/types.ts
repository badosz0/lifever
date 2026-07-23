export type ScheduledAppNotification = {
  /** Stable within its scope. Used to update or cancel an existing notification. */
  key: string;
  deliverAt: Date;
  title: string;
  body?: string;
  group?: string;
  sound?: string;
  extra?: Record<string, unknown>;
};
