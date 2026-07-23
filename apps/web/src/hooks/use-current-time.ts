import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

const millisecondsUntilNextMinute = (now: Date) =>
  MINUTE_MS - (now.getSeconds() * 1_000 + now.getMilliseconds());

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = window.setInterval(
        () => setCurrentTime(new Date()),
        MINUTE_MS,
      );
    }, millisecondsUntilNextMinute(new Date()));

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return currentTime;
}
