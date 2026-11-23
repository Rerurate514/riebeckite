import type { ContentManifestEntry } from "../types/content_manifest.js";
import { htmlToPlainText } from "../utils/text.js";

type ProjectedEntry = Pick<
  ContentManifestEntry,
  "frontmatter" | "html" | "plainText"
>;

export function isExcludedSlugPath(
  slug: string,
  excludedSlugs: readonly string[],
): boolean {
  return excludedSlugs.some(
    (excluded) => slug === excluded || slug.startsWith(`${excluded}/`),
  );
}

const plainTextByEntry = new WeakMap<
  Pick<ContentManifestEntry, "html" | "plainText">,
  string
>();

export function getEntryPlainText(
  entry: Pick<ContentManifestEntry, "html" | "plainText">,
): string {
  const cached = plainTextByEntry.get(entry);
  if (cached !== undefined) return cached;
  const plainText = entry.plainText ?? htmlToPlainText(entry.html);
  plainTextByEntry.set(entry, plainText);
  return plainText;
}

export function createEntryExcerpt(
  entry: ProjectedEntry,
  maxLength = 180,
): string {
  const description = entry.frontmatter.description;
  const text =
    typeof description === "string" && description.trim()
      ? description.trim()
      : getEntryPlainText(entry);

  return text.slice(0, maxLength);
}

export function extractHtmlHeadings(html: string): string[] {
  const headings: string[] = [];
  const headingPattern = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g;

  for (const match of html.matchAll(headingPattern)) {
    const heading = htmlToPlainText(match[2] ?? "");
    if (heading) headings.push(heading);
  }

  return headings;
}
