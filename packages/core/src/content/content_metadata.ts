const TAG_PATTERN = /(^|[\s([{"'])#([\p{L}\p{N}_\-/]+)/gu;

export function extractContentTags(markdown: string): string[] {
  TAG_PATTERN.lastIndex = 0;
  const tags: string[] = [];

  for (
    let match = TAG_PATTERN.exec(markdown);
    match !== null;
    match = TAG_PATTERN.exec(markdown)
  ) {
    const tag = normalizeTag(match[2] ?? "");
    if (tag) tags.push(tag);
  }

  return uniqueStrings(tags);
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
    const inlineMatch = line.match(/^aliases?:\s*(.+)$/i);
    if (inlineMatch?.[1]) {
      aliases.push(...parseYamlScalarOrList(inlineMatch[1]));
      continue;
    }

    if (/^aliases?:\s*$/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        const itemMatch = lines[j]?.match(/^\s*-\s*(.+)$/);
        if (!itemMatch?.[1]) break;
        aliases.push(stripYamlQuotes(itemMatch[1]));
      }
    }
  }
  return uniqueStrings(aliases.map((alias) => alias.trim()).filter(Boolean));
}

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/[/-]+$/, "");
  if (!cleaned) return null;

  const isPurelyNumeric = /^[\p{N}/\-_]+$/u.test(cleaned);
  if (isPurelyNumeric) return null;

  return cleaned;
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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
