import { useEffect, useState } from "react";

const SECOND_MS = 1_000;

const millisecondsUntilNextSecond = (now: Date) =>
  SECOND_MS - now.getMilliseconds();

export function useLiveTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = window.setInterval(
        () => setCurrentTime(new Date()),
        SECOND_MS,
      );
    }, millisecondsUntilNextSecond(new Date()));

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return currentTime;
}
