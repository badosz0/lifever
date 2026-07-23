import { getCountryFlag } from "@/features/formula1/lib/formula1-visuals";
import { cn } from "@/lib/cn";

const TWEMOJI_ASSET_BASE =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";

const toTwemojiCodepoint = (emoji: string) =>
  Array.from(emoji)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-");

type Formula1FlagProps = {
  country: string;
  className?: string;
};

export function Formula1Flag({ country, className }: Formula1FlagProps) {
  const emoji = getCountryFlag(country);

  return (
    <img
      src={`${TWEMOJI_ASSET_BASE}/${toTwemojiCodepoint(emoji)}.svg`}
      alt={`${country} flag`}
      className={cn("inline-block shrink-0 object-contain", className)}
      draggable={false}
      decoding="async"
    />
  );
}
