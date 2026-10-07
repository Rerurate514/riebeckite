export function localizeDocsHref(href: string, path: string): string {
  const language = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/.exec(path)?.[1];
  if (!language || !href.startsWith("/docs/")) return href;
  return `/${language}${href}`;
}
