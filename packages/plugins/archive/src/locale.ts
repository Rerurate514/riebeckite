export function archivePaginationLabels(locale: string | null | undefined): {
  previous: string;
  next: string;
} {
  return isJapanese(locale)
    ? { previous: "前のページ", next: "次のページ" }
    : { previous: "Previous", next: "Next" };
}

export function buildArchiveDescription(
  siteTitle: string,
  period: string,
  locale: string | null | undefined,
): string {
  return isJapanese(locale)
    ? `${siteTitle} の ${period} の記事一覧です。`
    : `Posts from ${period} on ${siteTitle}.`;
}

export function normalizeArchiveLocale(
  locale: string | null | undefined,
): string {
  const value = locale?.trim();
  return value ? value.replace(/_/g, "-") : "en-US";
}

export function formatArchivePeriod(
  value: string,
  locale: string | null | undefined,
): string {
  const match = /^(\d{4})(?:-(\d{1,2}))?$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const options: Intl.DateTimeFormatOptions =
    month === null
      ? { year: "numeric", timeZone: "UTC" }
      : { year: "numeric", month: "long", timeZone: "UTC" };
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, 1));
  const tag = isJapanese(locale) ? "ja-JP" : normalizeArchiveLocale(locale);
  try {
    return new Intl.DateTimeFormat(tag, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function isJapanese(locale: string | null | undefined): boolean {
  return Boolean(locale && /^ja($|[-_])/i.test(locale));
}
