export type WebLocale = "en" | "ja";

export function resolveWebLocale(lang: string | undefined): WebLocale {
  return lang && /^ja($|[-_])/i.test(lang) ? "ja" : "en";
}

export function toOgLocale(lang: string | undefined): string {
  return resolveWebLocale(lang) === "ja" ? "ja_JP" : "en_US";
}

type HreflangHeadTag = {
  tag?: string;
  attrs?: Record<string, string>;
};

export function getHreflangAlternates(
  headTags: readonly HreflangHeadTag[] | undefined,
): WebLocale[] {
  const languages = new Set<WebLocale>();
  for (const tag of headTags ?? []) {
    const hreflang = tag.attrs?.hreflang;
    if (tag.tag === "link" && tag.attrs?.rel === "alternate" && hreflang) {
      languages.add(resolveWebLocale(hreflang));
    }
  }
  return [...languages];
}
