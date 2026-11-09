import { uniqueStrings } from "../utils/collections.js";
import { scanMarkdownFenceLines } from "../utils/markdown.js";
import { normalizeTag } from "../utils/tags.js";

const TAG_PATTERN = /(^|[\s([{"'])#([\p{L}\p{N}_\-/]+)/gu;
const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const WIKILINK_PATTERN = /!?\[\[[^\]]*\]\]/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const HTML_CODE_PATTERN = /<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const INLINE_CODE_PATTERN = /(`+)[\s\S]*?\1/g;
const LINK_DESTINATION_PATTERN = /\]\([^)]*\)/g;
const REFERENCE_DEFINITION_PATTERN = /^ {0,3}\[[^\]]+\]:.*$/gm;

export function extractContentTags(markdown: string): string[] {
  const text = stripNonTextMarkdown(markdown);
  const tags: string[] = [];
  TAG_PATTERN.lastIndex = 0;

  for (
    let match = TAG_PATTERN.exec(text);
    match !== null;
    match = TAG_PATTERN.exec(text)
  ) {
    const tag = normalizeTag(match[2] ?? "");
    if (tag) tags.push(tag);
  }

  return uniqueStrings(tags);
}

function stripNonTextMarkdown(markdown: string): string {
  const withoutFences = scanMarkdownFenceLines(
    markdown.replace(FRONTMATTER_PATTERN, ""),
  )
    .filter((line) => !line.inFence)
    .map((line) => line.value)
    .join("\n");

  return withoutFences
    .replace(HTML_COMMENT_PATTERN, " ")
    .replace(HTML_CODE_PATTERN, " ")
    .replace(INLINE_CODE_PATTERN, " ")
    .replace(WIKILINK_PATTERN, " ")
    .replace(LINK_DESTINATION_PATTERN, "]")
    .replace(REFERENCE_DEFINITION_PATTERN, " ")
    .replace(HTML_TAG_PATTERN, " ");
}

export function normalizeFrontmatterTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.flatMap((tag) => normalizeFrontmatterTags(tag));
  }
  if (typeof tags !== "string") return [];
  return tags
    .split(/[\s,]+/)
    .map((tag) => normalizeTag(tag.replace(/^#/, "")))
    .filter((tag): tag is string => tag !== null);
}

export function extractFrontmatterAliases(markdown: string): string[] {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter?.[1]) return [];

  const aliases: string[] = [];
  const lines = frontmatter[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const inlineMatch = line.match(/^alias(?:es)?:\s*(.+)$/i);
    if (inlineMatch?.[1]) {
      aliases.push(...parseYamlScalarOrList(inlineMatch[1]));
      continue;
    }

    if (/^alias(?:es)?:\s*$/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        const itemMatch = lines[j]?.match(/^\s*-\s*(.+)$/);
        if (!itemMatch?.[1]) break;
        aliases.push(stripYamlQuotes(itemMatch[1]));
      }
    }
  }
  return uniqueStrings(aliases.map((alias) => alias.trim()).filter(Boolean));
}

function parseYamlScalarOrList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map(stripYamlQuotes).filter(Boolean);
  }
  return [stripYamlQuotes(trimmed)];
}

function stripYamlQuotes(value: string): string {
  return value
    .trim()
    .replace(/^[']|[']$/g, "")
    .replace(/^["]|["]$/g, "");
}
