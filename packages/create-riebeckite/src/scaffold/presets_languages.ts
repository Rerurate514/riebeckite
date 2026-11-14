export const SCAFFOLD_LANGUAGES = [
  "en",
  "ja",
  "zh-CN",
  "es",
  "de",
  "fr",
  "ko",
] as const;

export type ScaffoldLanguage = (typeof SCAFFOLD_LANGUAGES)[number];

export function defaultLanguageForLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("ko")) return "ko";
  return "en";
}

export type ScaffoldPresetName =
  | "starter"
  | "digital-garden"
  | "blog"
  | "docs"
  | "portfolio"
  | "minimal"
  | "showcase"
  | "empty";

export const SCAFFOLD_PRESET_NAMES: readonly ScaffoldPresetName[] = [
  "starter",
  "digital-garden",
  "blog",
  "docs",
  "portfolio",
  "minimal",
  "showcase",
  "empty",
];

export function isScaffoldPresetName(
  value: string,
): value is ScaffoldPresetName {
  return (SCAFFOLD_PRESET_NAMES as readonly string[]).includes(value);
}
