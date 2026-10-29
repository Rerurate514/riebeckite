import {
  type ContentLocationInput,
  extractContentLinks,
  extractMarkdownLinkUrls,
  type PostFrontmatter,
} from "@riebeckite/core";
import { resolveLocalizedTarget, splitLinkUrl } from "./routing.js";
import type { DetectedContent, L10nState } from "./types.js";

const PUBLICATION_KEYS = [
  "visibility",
  "publishAt",
  "publish",
  "private",
  "draft",
] as const;

export function computeLocalizationSignatures(
  state: L10nState,
  entries: readonly ContentLocationInput[],
  contentIndex: Map<string, string>,
): ReadonlyMap<string, string> {
  const markdownBySlug = new Map(
    entries.map((entry) => [entry.slug, entry.markdown]),
  );
  const membersByTranslation = new Map<string, string[]>();
  for (const member of state.contents.values()) {
    const members = membersByTranslation.get(member.translationId) ?? [];
    members.push(groupMemberToken(state, member));
    membersByTranslation.set(member.translationId, members);
  }
  for (const members of membersByTranslation.values()) members.sort();

  const collectParts = (
    content: DetectedContent,
    trail: ReadonlySet<string>,
  ): string[] => {
    const members = membersByTranslation.get(content.translationId) ?? [];
    const parts = [
      `own:${content.lang}\u0001${content.translationId}`,
      ...members.map((member) => `group:${member}`),
    ];
    const markdown = markdownBySlug.get(content.slug) ?? "";
    const links = extractContentLinks(markdown, contentIndex);
    for (const link of links) {
      if (link.kind === "image" || link.kind === "attachment") continue;
      parts.push(
        `wiki:${link.raw.toLowerCase()}=${
          link.slug ? localizedResolutionToken(state, content, link.slug) : ""
        }`,
      );
    }
    for (const permalink of referencedPermalinks(
      markdown,
      state.slugsByPermalink,
    )) {
      const targetSlug = state.slugsByPermalink.get(permalink);
      parts.push(
        `url:${permalink}=${
          targetSlug ? localizedResolutionToken(state, content, targetSlug) : ""
        }`,
      );
    }
    if (trail.size < 3) {
      for (const link of links) {
        if (!link.embed || !link.slug || trail.has(link.slug)) continue;
        const embedded = state.contents.get(link.slug);
        if (!embedded) continue;
        parts.push(
          ...collectParts(embedded, new Set([...trail, embedded.slug])),
        );
      }
    }
    return parts;
  };

  const signatures = new Map<string, string>();
  for (const content of state.contents.values()) {
    const parts = collectParts(content, new Set());
    parts.sort();
    signatures.set(content.slug, parts.join("\n"));
  }
  return signatures;
}

function groupMemberToken(state: L10nState, member: DetectedContent): string {
  return [
    member.lang,
    member.slug,
    state.locations?.get(member.slug)?.permalink ?? "",
    publicationSignal(member.frontmatter),
  ].join("\u0001");
}

function publicationSignal(frontmatter: PostFrontmatter): string {
  return PUBLICATION_KEYS.map((key) => signalValue(frontmatter[key])).join(
    "\u0001",
  );
}

function signalValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function localizedResolutionToken(
  state: L10nState,
  source: DetectedContent,
  targetSlug: string,
): string {
  const target = resolveLocalizedTarget(state, source, targetSlug);
  if (!target) return "";
  return `${target.slug}\u0001${state.locations?.get(target.slug)?.permalink ?? ""}`;
}

function referencedPermalinks(
  markdown: string,
  slugsByPermalink: ReadonlyMap<string, string>,
): string[] {
  if (slugsByPermalink.size === 0) return [];
  const found = new Set<string>();
  for (const url of extractMarkdownLinkUrls(markdown)) {
    const { permalink } = splitLinkUrl(url);
    if (slugsByPermalink.has(permalink)) found.add(permalink);
  }
  return [...found].sort();
}
