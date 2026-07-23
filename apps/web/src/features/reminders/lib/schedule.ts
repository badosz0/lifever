export const getTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const combineReminderDate = (day: Date, current: Date | null) => {
  const next = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    current?.getHours() ?? 9,
    current?.getMinutes() ?? 0,
    0,
    0,
  );
  return next.toISOString();
};

export const combineReminderTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return next.toISOString();
};
