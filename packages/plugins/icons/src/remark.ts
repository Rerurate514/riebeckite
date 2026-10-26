import type { ContentIcon } from "@riebeckite/core";
import type { Html, Parent, Root, Text } from "mdast";

type InlineIconOptions = {
  readonly identifier: string;
  readonly resolve: (name: string) => ContentIcon | undefined;
};

type SourceFile = { readonly value: unknown };
const SKIP = new Set([
  "code",
  "inlineCode",
  "html",
  "link",
  "linkReference",
  "image",
  "imageReference",
  "definition",
  "yaml",
  "math",
  "inlineMath",
  "mathBlock",
  "wikiLink",
  "wikilink",
]);

export function remarkIcons(options: InlineIconOptions) {
  const identifier = options.identifier || ":";
  const escaped = escapeRegExp(identifier);
  const pattern = new RegExp(
    `${escaped}((?:[\\p{L}\\p{N}_-]{1,64}):\\d{17,18}|[\\p{L}\\p{N}_-]{1,64})${escaped}`,
    "gu",
  );

  return (tree: Root, file: SourceFile): void => {
    walk(tree, false, file, pattern, options.resolve);
  };
}

function walk(
  parent: Parent,
  skip: boolean,
  file: SourceFile,
  pattern: RegExp,
  resolve: InlineIconOptions["resolve"],
): void {
  const children = parent.children;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!child) continue;
    if (child.type === "text" && !skip) {
      const replacement = transformText(child, file, pattern, resolve);
      if (replacement) {
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
      continue;
    }
    if ("children" in child) {
      walk(
        child as Parent,
        skip || SKIP.has(child.type),
        file,
        pattern,
        resolve,
      );
    }
  }
}

function transformText(
  node: Text,
  file: SourceFile,
  pattern: RegExp,
  resolve: InlineIconOptions["resolve"],
): (Text | Html)[] | undefined {
  const value = node.value;
  if (!value) return undefined;
  const matches = [...value.matchAll(pattern)];
  if (matches.length === 0) return undefined;

  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const raw =
    start !== undefined && end !== undefined
      ? String(file.value).slice(start, end)
      : undefined;
  const sourceMap = raw === undefined ? undefined : buildSourceMap(raw, value);

  const parts: (Text | Html)[] = [];
  let cursor = 0;
  let changed = false;
  for (const match of matches) {
    const name = match[1];
    const offset = match.index;
    if (!name || offset === undefined || name.includes(":")) continue;
    if (
      raw !== undefined &&
      sourceMap !== undefined &&
      isEscaped(raw, sourceMap[offset])
    ) {
      continue;
    }
    const icon = resolve(name);
    if (!icon) continue;
    if (offset > cursor) {
      parts.push({ type: "text", value: value.slice(cursor, offset) });
    }
    parts.push({ type: "html", value: icon.html });
    cursor = offset + match[0].length;
    changed = true;
  }
  if (!changed) return undefined;
  if (cursor < value.length) {
    parts.push({ type: "text", value: value.slice(cursor) });
  }
  return parts;
}

function buildSourceMap(raw: string, value: string): number[] | undefined {
  const map: number[] = [];
  let rawIndex = 0;
  let valueIndex = 0;
  while (valueIndex < value.length) {
    if (rawIndex >= raw.length) return undefined;
    if (raw[rawIndex] === "\\" && raw[rawIndex + 1] === value[valueIndex]) {
      map.push(rawIndex + 1);
      rawIndex += 2;
      valueIndex += 1;
      continue;
    }
    if (raw[rawIndex] === value[valueIndex]) {
      map.push(rawIndex);
      rawIndex += 1;
      valueIndex += 1;
      continue;
    }
    return undefined;
  }
  return map;
}

function isEscaped(raw: string, index: number | undefined): boolean {
  if (index === undefined || index === 0) return false;
  let count = 0;
  for (
    let cursor = index - 1;
    cursor >= 0 && raw[cursor] === "\\";
    cursor -= 1
  ) {
    count += 1;
  }
  return count % 2 === 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
