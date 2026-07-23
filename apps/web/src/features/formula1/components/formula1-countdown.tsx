import { formatCountdown } from "@/features/formula1/lib/formula1-dates";
import { useLiveTime } from "@/hooks/use-live-time";

type Formula1CountdownProps = {
  target: Date;
};

export function Formula1Countdown({ target }: Formula1CountdownProps) {
  const now = useLiveTime();

  return (
    <span className="whitespace-nowrap tabular-nums">
      {formatCountdown(target, now)}
    </span>
  );
}
