import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { evaluateDataviewExpression } from "./evaluate_expression.js";
import { isTruthy } from "./evaluate_logic.js";
import { scopeOf, sortRows } from "./evaluate_rows.js";
import type { DataviewRow } from "./evaluate_types.js";
import { formatGroupKey, normalizeFolder, stripHash } from "./evaluate_util.js";
import type { DataviewCommand, DataviewFrom, DataviewSource } from "./types.js";

export function executeCommand(
  command: DataviewCommand,
  rows: DataviewRow[],
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewRow[] {
  switch (command.kind) {
    case "from":
      return rows.filter((row) =>
        matchesDataviewFrom(command.from, row.entry, manifest),
      );
    case "where":
      return rows.filter((row) =>
        isTruthy(
          evaluateDataviewExpression(
            command.expression,
            scopeOf(row, manifest, buildTime),
          ),
        ),
      );
    case "flatten":
      return flattenRows(command, rows, manifest, buildTime);
    case "sort":
      return sortRows(rows, command.sort, manifest, buildTime);
    case "groupBy": {
      const groups = new Map<string, DataviewRow[]>();
      const values = new Map<string, unknown>();
      for (const row of rows) {
        const value = evaluateDataviewExpression(
          command.expression,
          scopeOf(row, manifest, buildTime),
        );
        const key = formatGroupKey(value);
        const bucket = groups.get(key) ?? [];
        bucket.push(row);
        groups.set(key, bucket);
        values.set(key, value);
      }
      return [...groups.entries()].map(([key, bucket]) => ({
        entry: bucket[0]?.entry as ContentManifestEntry,
        fields: { [command.label ?? command.field]: values.get(key) },
        group: { key, rows: bucket },
      }));
    }
    case "limit":
      return rows.slice(0, command.limit);
    default:
      return rows;
  }
}

export function flattenRows(
  command: Extract<DataviewCommand, { kind: "flatten" }>,
  rows: DataviewRow[],
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewRow[] {
  const key =
    command.label ??
    (command.expression.kind === "field"
      ? command.expression.path.join(".")
      : "value");

  return rows.flatMap((row) => {
    const value = evaluateDataviewExpression(
      command.expression,
      scopeOf(row, manifest, buildTime),
    );
    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return [];
    return items.map((item) => ({
      ...row,
      fields: { ...row.fields, [key]: item },
    }));
  });
}

export function matchesDataviewFrom(
  from: DataviewFrom | null,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): boolean {
  if (!from) return true;

  switch (from.kind) {
    case "source":
      return matchesSource(from.source, entry, manifest);
    case "not":
      return !matchesDataviewFrom(from.child, entry, manifest);
    case "and":
      return (
        matchesDataviewFrom(from.left, entry, manifest) &&
        matchesDataviewFrom(from.right, entry, manifest)
      );
    case "or":
      return (
        matchesDataviewFrom(from.left, entry, manifest) ||
        matchesDataviewFrom(from.right, entry, manifest)
      );
    default:
      return true;
  }
}

export function matchesSource(
  source: DataviewSource,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): boolean {
  switch (source.kind) {
    case "tag": {
      const wanted = stripHash(source.value).toLowerCase();
      return entry.tags.some(
        (tag) =>
          tag.toLowerCase() === wanted ||
          tag.toLowerCase().startsWith(`${wanted}/`),
      );
    }
    case "folder": {
      const folder = normalizeFolder(source.value).replace(
        /\.(md|markdown)$/i,
        "",
      );
      if (folder.length === 0) return true;
      return entry.slug === folder || entry.slug.startsWith(`${folder}/`);
    }
    case "link": {
      const target = manifest.contentIndex.get(source.value.toLowerCase());
      if (!target) return false;
      const sources = manifest.incomingLinks.get(target) ?? [];
      return sources.includes(entry.slug);
    }
    default:
      return false;
  }
}
