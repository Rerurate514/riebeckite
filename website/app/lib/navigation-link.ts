const LOCALIZED_PREFIXES = ["/docs/", "/blog/"];

export function localizeSiteHref(href: string, path: string): string {
  const language = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/.exec(path)?.[1];
  if (
    !language ||
    !LOCALIZED_PREFIXES.some((prefix) => href.startsWith(prefix))
  ) {
    return href;
  }
  return `/${language}${href}`;
}
