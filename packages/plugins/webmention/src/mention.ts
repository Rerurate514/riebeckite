/**
 * Storage- and runtime-independent Webmention records.
 *
 * A mention is only created after the source document has been fetched and
 * verified to link to the target, so every stored record is a verified
 * mention by construction.
 */
export const WEBMENTION_TYPES = [
  "mention",
  "reply",
  "like",
  "repost",
  "bookmark",
] as const;

export type WebmentionType = (typeof WEBMENTION_TYPES)[number];

export type WebmentionAuthor = Readonly<{
  name?: string;
  url?: string;
  photo?: string;
}>;

export type WebmentionMention = Readonly<{
  /** Absolute URL of the verified source document. */
  source: string;
  /** Absolute target URL on this site. */
  target: string;
  type: WebmentionType;
  /** ISO-8601 timestamp of the verification that created this record. */
  verifiedAt: string;
  /** ISO-8601 publication date discovered on the source, when available. */
  publishedAt?: string;
  /** Source title, when discoverable. */
  title?: string;
  /** Short plain-text excerpt of the source, when discoverable. */
  excerpt?: string;
  author?: WebmentionAuthor;
}>;

/** Stable identity of a mention: a source/target pair. */
export function webmentionKey(
  mention: Pick<WebmentionMention, "source" | "target">,
): string {
  return `${mention.source}\n${mention.target}`;
}
