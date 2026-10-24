const NAMED_COLORS = new Set([
  "aqua",
  "black",
  "blue",
  "brown",
  "crimson",
  "currentcolor",
  "cyan",
  "darkblue",
  "darkgreen",
  "darkorange",
  "darkred",
  "fuchsia",
  "gold",
  "gray",
  "green",
  "grey",
  "indigo",
  "lime",
  "magenta",
  "maroon",
  "navy",
  "olive",
  "orange",
  "pink",
  "purple",
  "red",
  "silver",
  "teal",
  "transparent",
  "violet",
  "white",
  "yellow",
]);

const ICONIC_COLORS: Readonly<Record<string, string>> = {
  red: "var(--rr-icon-red)",
  orange: "var(--rr-icon-orange)",
  yellow: "var(--rr-icon-yellow)",
  green: "var(--rr-icon-green)",
  cyan: "var(--rr-icon-cyan)",
  blue: "var(--rr-icon-blue)",
  purple: "var(--rr-icon-purple)",
  pink: "var(--rr-icon-pink)",
  gray: "var(--rr-icon-gray)",
};

export function normalizeColor(
  value: unknown,
  options: { readonly iconicNames?: boolean } = {},
): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (!color || color.length > 64) return undefined;

  if (options.iconicNames) {
    const named = ICONIC_COLORS[color.toLowerCase()];
    if (named) return named;
  }

  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    return color.toLowerCase();
  }
  if (/^[0-9a-f]{1,6}$/i.test(color)) {
    return `#${color.toLowerCase().padStart(6, "0")}`;
  }
  if (
    /^(?:rgb|rgba|hsl|hsla)\(\s*[-+.%\d\s,/a-z]+\)$/i.test(color) &&
    !/url/i.test(color)
  ) {
    return color;
  }
  if (NAMED_COLORS.has(color.toLowerCase())) return color.toLowerCase();
  return undefined;
}
