type CalendarCurrentTimeLineProps = {
  label: string;
  top: number;
};

export function CalendarCurrentTimeLine({
  label,
  top,
}: CalendarCurrentTimeLineProps) {
  return (
    <div
      data-calendar-current-time
      className="pointer-events-none absolute inset-x-0 z-10 -translate-y-1/2"
      style={{ top }}
      role="img"
      aria-label={`Current time ${label}`}
    >
      <span className="block h-0.5 rounded-full bg-red-500 shadow-[0_0_4px_rgb(239_68_68/.28)]" />
      <span className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-red-500" />
    </div>
  );
}
