import {
  type CalendarDateInput,
  compareDates,
  isAfterDate,
  isBeforeDate,
  toCalendarDate,
} from "./dates";

type CalendarLayoutInterval = {
  endAt: CalendarDateInput;
  startAt: CalendarDateInput;
};

export type LaidOutCalendarEvent<T extends CalendarLayoutInterval> = {
  event: T;
  lane: number;
  laneCount: number;
  leftPercent: number;
  widthPercent: number;
};

const MAX_STACK_STEP_PERCENT = 14;
const MIN_FRONT_CARD_WIDTH_PERCENT = 48;

const eventStart = (event: CalendarLayoutInterval) =>
  toCalendarDate(event.startAt);
const eventEnd = (event: CalendarLayoutInterval) =>
  toCalendarDate(event.endAt);

export const getStackedEventPosition = (lane: number, laneCount: number) => {
  if (laneCount <= 1) {
    return { leftPercent: 0, widthPercent: 100 };
  }

  const stepPercent = Math.min(
    MAX_STACK_STEP_PERCENT,
    (100 - MIN_FRONT_CARD_WIDTH_PERCENT) / (laneCount - 1),
  );

  return {
    leftPercent: lane * stepPercent,
    widthPercent: 100 - stepPercent * (laneCount - 1),
  };
};

export function layoutOverlappingEvents<T extends CalendarLayoutInterval>(
  events: T[],
): LaidOutCalendarEvent<T>[] {
  const sorted = [...events].sort(
    (left, right) =>
      compareDates(eventStart(left), eventStart(right)) ||
      compareDates(eventEnd(left), eventEnd(right)),
  );
  const result: LaidOutCalendarEvent<T>[] = [];
  let group: T[] = [];
  let groupEnd: Date | null = null;

  const commitGroup = () => {
    if (group.length === 0) return;
    const columnEnds: Date[] = [];
    const positioned = group.map((event) => {
      const start = eventStart(event);
      let lane = columnEnds.findIndex((end) => !isAfterDate(end, start));
      if (lane === -1) lane = columnEnds.length;
      columnEnds[lane] = eventEnd(event);
      return { event, lane };
    });
    const laneCount = columnEnds.length;
    result.push(
      ...positioned.map((item) => ({
        ...item,
        laneCount,
        ...getStackedEventPosition(item.lane, laneCount),
      })),
    );
  };

  for (const event of sorted) {
    const start = eventStart(event);
    if (groupEnd && !isBeforeDate(start, groupEnd)) {
      commitGroup();
      group = [];
      groupEnd = null;
    }
    group.push(event);
    const end = eventEnd(event);
    if (!groupEnd || isAfterDate(end, groupEnd)) groupEnd = end;
  }
  commitGroup();

  return result;
}
