export function formatPostDate(
  value: string | null | undefined,
  language: string | undefined,
  style: "long" | "medium" = "long",
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language ?? "en", { dateStyle: style }).format(
    date,
  );
}
