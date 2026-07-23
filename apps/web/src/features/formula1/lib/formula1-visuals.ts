const constructorColors: Record<string, string> = {
  alpine: "#ff87bc",
  aston_martin: "#229971",
  audi: "#f50537",
  cadillac: "#1f2937",
  ferrari: "#e80020",
  haas: "#9ca3af",
  mclaren: "#ff8000",
  mercedes: "#00a19b",
  rb: "#6692ff",
  red_bull: "#3671c6",
  williams: "#1868db",
};

const countryFlags: Record<string, string> = {
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Azerbaijan: "🇦🇿",
  Bahrain: "🇧🇭",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  China: "🇨🇳",
  Hungary: "🇭🇺",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Monaco: "🇲🇨",
  Netherlands: "🇳🇱",
  Qatar: "🇶🇦",
  Singapore: "🇸🇬",
  Spain: "🇪🇸",
  UAE: "🇦🇪",
  UK: "🇬🇧",
  USA: "🇺🇸",
};

export const getConstructorColor = (id: string) =>
  constructorColors[id] ?? "#64748b";

export const getCountryFlag = (country: string) =>
  countryFlags[country] ?? "🏁";
