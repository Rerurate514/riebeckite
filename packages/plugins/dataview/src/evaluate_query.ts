import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { noteFields, taskInlineFields } from "./evaluate_fields.js";
import { executeCommand } from "./evaluate_match.js";
import type {
  DataviewEvaluateOptions,
  DataviewGroup,
  DataviewNote,
  DataviewRow,
  DataviewSelection,
} from "./evaluate_types.js";
import { parseInlineFields } from "./inline_fields.js";
import { parseDataviewTasks } from "./tasks.js";
import type { DataviewCommand, DataviewSpec } from "./types.js";

export function selectDataviewEntries(
  spec: DataviewSpec,
  manifest: ContentManifest,
  defaultLimit: number | null,
  options: DataviewEvaluateOptions = {},
): DataviewSelection {
  const notes = options.notes;
  const buildTime = options.buildTime;
  let rows: DataviewRow[] = manifest.entries.map((entry) => ({
    entry,
    fields: noteFields(notes?.get(entry.slug)),
  }));

  if (spec.type === "task") {
    rows = rows.flatMap((row) =>
      (notes?.get(row.entry.slug)?.tasks ?? []).map((task) => ({
        entry: row.entry,
        task,
        fields: { ...row.fields, ...taskInlineFields(task) },
      })),
    );
  }

  let grouped = false;
  const commands = spec.commands ?? legacyCommands(spec);
  for (const command of commands) {
    rows = executeCommand(command, rows, manifest, buildTime);
    if (command.kind === "groupBy") grouped = true;
  }
  if (defaultLimit !== null && !commands.some((c) => c.kind === "limit")) {
    rows = rows.slice(0, defaultLimit);
  }

  return {
    entries: uniqueEntries(rows),
    rows,
    groups: grouped ? rows.map(toGroup) : [],
    grouped,
  };
}

export async function loadDataviewNotes(
  entries: readonly ContentManifestEntry[],
  read: (entry: ContentManifestEntry) => Promise<string | null>,
): Promise<Map<string, DataviewNote>> {
  const notes = new Map<string, DataviewNote>();
  await Promise.all(
    entries.map(async (entry) => {
      const markdown = await read(entry);
      if (markdown === null) return;
      notes.set(entry.slug, {
        fields: parseInlineFields(markdown),
        tasks: parseDataviewTasks(markdown),
      });
    }),
  );
  return notes;
}

export function toGroup(row: DataviewRow): DataviewGroup {
  const rows = row.group?.rows ?? [row];
  return {
    key: row.group?.key ?? "",
    entries: uniqueEntries(rows),
    rows,
  };
}

export function uniqueEntries(
  rows: readonly DataviewRow[],
): ContentManifestEntry[] {
  const seen = new Set<string>();
  const entries: ContentManifestEntry[] = [];
  for (const row of rows) {
    if (seen.has(row.entry.slug)) continue;
    seen.add(row.entry.slug);
    entries.push(row.entry);
  }
  return entries;
}

export function legacyCommands(spec: DataviewSpec): DataviewCommand[] {
  const commands: DataviewCommand[] = [];
  if (spec.from) commands.push({ kind: "from", from: spec.from });
  if (spec.where) commands.push({ kind: "where", expression: spec.where });
  if (spec.sort.length > 0) commands.push({ kind: "sort", sort: spec.sort });
  if (spec.limit !== null) commands.push({ kind: "limit", limit: spec.limit });
  if (spec.groupBy) {
    commands.push({
      kind: "groupBy",
      expression: { kind: "field", path: spec.groupBy.split(".") },
      field: spec.groupBy,
    });
  }
  return commands;
}
