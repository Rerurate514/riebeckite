export type WebLocale = "en" | "ja";

export function resolveWebLocale(lang: string | undefined): WebLocale {
  return lang && /^ja($|[-_])/i.test(lang) ? "ja" : "en";
}

export function archivePaginationLabels(lang: string | undefined): {
  previous: string;
  next: string;
} {
  return resolveWebLocale(lang) === "ja"
    ? { previous: "前のページ", next: "次のページ" }
    : { previous: "Previous", next: "Next" };
}

export function formatArchivePeriod(
  value: string,
  lang: string | undefined,
): string {
  const match = /^(\d{4})(?:-(\d{1,2}))?$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const locale = resolveWebLocale(lang) === "ja" ? "ja-JP" : "en-US";
  const options: Intl.DateTimeFormatOptions =
    month === null
      ? { year: "numeric", timeZone: "UTC" }
      : { year: "numeric", month: "long", timeZone: "UTC" };
  return new Intl.DateTimeFormat(locale, options).format(
    new Date(Date.UTC(year, (month ?? 1) - 1, 1)),
  );
}

export function buildTagDescription(
  siteTitle: string,
  tag: string,
  lang: string | undefined,
): string {
  return resolveWebLocale(lang) === "ja"
    ? `${siteTitle} の #${tag} タグの記事一覧です。`
    : `Posts tagged #${tag} on ${siteTitle}.`;
}

export function buildArchiveDescription(
  siteTitle: string,
  period: string,
  lang: string | undefined,
): string {
  return resolveWebLocale(lang) === "ja"
    ? `${siteTitle} の ${period} の記事一覧です。`
    : `Posts from ${period} on ${siteTitle}.`;
}

export function toOgLocale(lang: string | undefined): string {
  return resolveWebLocale(lang) === "ja" ? "ja_JP" : "en_US";
}

export type HreflangHeadTag = {
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
