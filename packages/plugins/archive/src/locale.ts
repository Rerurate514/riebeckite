export function archivePaginationLabels(locale: string | null | undefined): {
  previous: string;
  next: string;
} {
  return isJapanese(locale)
    ? { previous: "前のページ", next: "次のページ" }
    : { previous: "Previous", next: "Next" };
}

export function formatArchivePeriod(
  value: string,
  locale: string | null | undefined,
): string {
  const match = /^(\d{4})(?:-(\d{1,2}))?$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const tag = isJapanese(locale)
    ? "ja-JP"
    : locale && locale.trim() !== ""
      ? locale
      : "en-US";
  const options: Intl.DateTimeFormatOptions =
    month === null
      ? { year: "numeric", timeZone: "UTC" }
      : { year: "numeric", month: "long", timeZone: "UTC" };
  return new Intl.DateTimeFormat(tag, options).format(
    new Date(Date.UTC(year, (month ?? 1) - 1, 1)),
  );
}

function isJapanese(locale: string | null | undefined): boolean {
  return Boolean(locale && /^ja($|[-_])/i.test(locale));
}
