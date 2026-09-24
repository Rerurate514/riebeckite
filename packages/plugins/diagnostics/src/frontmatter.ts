export type ParsedFrontmatter = {
  hasFrontmatter: boolean;
  values: Record<string, unknown>;
};

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) return { hasFrontmatter: false, values: {} };
  return { hasFrontmatter: true, values: parseFrontmatterBlock(match[1]) };
}

export function hasField(
  values: Record<string, unknown>,
  field: string,
): boolean {
  if (!(field in values)) return false;
  const value = values[field];
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export function getNoteTitle(
  values: Record<string, unknown>,
  slug: string,
): string {
  const title = values.title;
  return typeof title === "string" && title.trim() ? title : slug;
}

export function isNotePublic(
  publishStrategy: "explicit" | "selective",
  values: Record<string, unknown>,
): boolean {
  if (publishStrategy === "explicit") {
    return values.publish === true;
  }
  return !(values.private === true || values.draft === true);
}

function parseFrontmatterBlock(body: string): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const lines = body.split(/\r?\n/);
  let openKey: string | null = null;
  const pending: string[] = [];

  const closeList = () => {
    if (openKey !== null) {
      values[openKey] = pending.length > 0 ? [...pending] : [];
    }
    openKey = null;
    pending.length = 0;
  };

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      closeList();
      const [, key, rest] = keyMatch;
      const trimmed = rest.trim();
      if (trimmed === "") {
        openKey = key;
      } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        values[key] = trimmed
          .slice(1, -1)
          .split(",")
          .map((item) => stripQuotes(item.trim()))
          .filter(Boolean);
      } else {
        values[key] = parseScalar(trimmed);
      }
      continue;
    }

    const itemMatch = line.match(/^\s*-\s+(.+)$/);
    if (itemMatch) {
      if (openKey !== null) {
        pending.push(stripQuotes(itemMatch[1].trim()));
      }
      continue;
    }

    if (line.trim() === "") continue;
    closeList();
  }

  closeList();
  return values;
}

function parseScalar(value: string): unknown {
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}
