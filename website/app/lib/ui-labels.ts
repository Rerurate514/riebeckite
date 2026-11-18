import { config } from "virtual:riebeckite/config";

export type UiLabels = {
  documentation: string;
  tableOfContents: string;
  menu: string;
  navigation: string;
  primaryNavigation: string;
  secondaryNavigation: string;
  footerNavigation: string;
};

const en: UiLabels = {
  documentation: "Documentation",
  tableOfContents: "Table of contents",
  menu: "Menu",
  navigation: "Navigation",
  primaryNavigation: "Primary navigation",
  secondaryNavigation: "Secondary navigation",
  footerNavigation: "Footer navigation",
};

export function resolveUiLabels(language: string | undefined): UiLabels {
  const locale = config.ui?.locale ?? language;
  const dictionary =
    locale === undefined
      ? undefined
      : Object.entries(config.ui?.labels ?? {}).find(
          ([key]) => key.toLowerCase() === locale.toLowerCase(),
        )?.[1];
  if (dictionary === undefined) return en;
  const resolved: Record<string, string> = { ...en };
  for (const key of Object.keys(en)) {
    const value = dictionary[key];
    if (typeof value === "string" && value !== "") resolved[key] = value;
  }
  return resolved as unknown as UiLabels;
}
