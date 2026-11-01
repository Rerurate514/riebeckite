import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import type { InlineFields } from "./inline_fields.js";
import { parseInlineFields } from "./inline_fields.js";
import { type DataviewTask, parseDataviewTasks } from "./tasks.js";
import type {
  DataviewCommand,
  DataviewComparisonOperator,
  DataviewExpression,
  DataviewFrom,
  DataviewSort,
  DataviewSource,
  DataviewSpec,
} from "./types.js";

export type DataviewNote = {
  readonly fields: InlineFields;
  readonly tasks: readonly DataviewTask[];
};

export type DataviewEvaluateOptions = {
  readonly notes?: ReadonlyMap<string, DataviewNote>;
  readonly buildTime?: Date;
};

export type DataviewScope = {
  entry: ContentManifestEntry;
  manifest: ContentManifest;
  fields?: Readonly<Record<string, unknown>>;
  task?: DataviewTask;
  buildTime?: Date;
};

export type DataviewRow = {
  entry: ContentManifestEntry;
  fields?: Readonly<Record<string, unknown>>;
  task?: DataviewTask;
  group?: { key: string; rows: DataviewRow[] };
};

export type DataviewGroup = {
  key: string;
  entries: ContentManifestEntry[];
  rows: DataviewRow[];
};

export type DataviewSelection = {
  entries: ContentManifestEntry[];
  rows: DataviewRow[];
  groups: DataviewGroup[];
  grouped: boolean;
};

export class DataviewEvaluationError extends Error {}

const TASK_FIELDS = new Set([
  "status",
  "checked",
  "completed",
  "fullyCompleted",
  "text",
  "visual",
  "line",
  "lineCount",
  "path",
  "section",
  "tags",
  "outlinks",
  "children",
  "link",
  "task",
  "annotated",
  "parent",
  "blockId",
]);

/**
 * Select the manifest entries a spec matches. Commands run in the order they
 * were written, as Dataview documents.
 */
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

/** Parses inline fields and tasks from every note that has a source. */
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

function noteFields(
  note: DataviewNote | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!note) return undefined;
  return Object.fromEntries(note.fields);
}

function taskInlineFields(task: DataviewTask): Record<string, unknown> {
  return Object.fromEntries(task.fields);
}

function executeCommand(
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

function flattenRows(
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

function matchesSource(
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

export function evaluateDataviewExpression(
  expression: DataviewExpression,
  scope: DataviewScope,
): unknown {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "list":
      return expression.items.map((item) =>
        evaluateDataviewExpression(item, scope),
      );
    case "field":
      return readDataviewField(
        scope.entry,
        expression.path,
        scope.manifest,
        scope.fields,
        scope.task,
        scope.buildTime,
      );
    case "not":
      return !isTruthy(evaluateDataviewExpression(expression.operand, scope));
    case "and":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) &&
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "or":
      return (
        isTruthy(evaluateDataviewExpression(expression.left, scope)) ||
        isTruthy(evaluateDataviewExpression(expression.right, scope))
      );
    case "unary":
      return negate(evaluateDataviewExpression(expression.operand, scope));
    case "arithmetic":
      return arithmetic(
        expression.operator,
        evaluateDataviewExpression(expression.left, scope),
        evaluateDataviewExpression(expression.right, scope),
      );
    case "compare":
      return compareValues(
        expression.operator,
        evaluateDataviewExpression(expression.left, scope),
        evaluateDataviewExpression(expression.right, scope),
      );
    case "call":
      return callFunction(expression, scope);
    default:
      return undefined;
  }
}

function callFunction(
  expression: Extract<DataviewExpression, { kind: "call" }>,
  scope: DataviewScope,
): unknown {
  const args = expression.args.map((arg) =>
    evaluateDataviewExpression(arg, scope),
  );

  switch (expression.name) {
    case "contains":
      return containsValue(args[0], args[1]);
    case "date":
      return args[0] === undefined ? args[0] : toDate(args[0]);
    case "dateformat":
      return formatDateValue(args[0], args[1]);
    case "number": {
      const numeric = toNumber(args[0]);
      return numeric === null ? null : numeric;
    }
    case "string":
      return args[0] === undefined || args[0] === null ? null : String(args[0]);
    case "length":
      return lengthOf(args[0]);
    case "lower":
      return typeof args[0] === "string" ? args[0].toLowerCase() : null;
    case "upper":
      return typeof args[0] === "string" ? args[0].toUpperCase() : null;
    case "trim":
      return typeof args[0] === "string" ? args[0].trim() : null;
    case "round":
      return roundValue(args[0], args[1], Math.round);
    case "floor":
      return roundValue(args[0], args[1], Math.floor);
    case "ceil":
      return roundValue(args[0], args[1], Math.ceil);
    case "min":
      return aggregate(args, (values) => Math.min(...values));
    case "max":
      return aggregate(args, (values) => Math.max(...values));
    case "sum":
      return aggregate(args, (values) => values.reduce((a, b) => a + b, 0));
    case "average":
    case "mean": {
      const values = numericValues(args);
      if (values.length === 0) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    case "startswith":
      return textStartsWith(args[0], args[1], true);
    case "endswith":
      return textStartsWith(args[0], args[1], false);
    case "join":
      return Array.isArray(args[0])
        ? args[0].map((item) => String(item ?? "")).join(String(args[1] ?? ""))
        : null;
    case "reverse":
      return Array.isArray(args[0]) ? [...args[0]].reverse() : null;
    case "sort": {
      if (!Array.isArray(args[0])) return null;
      return [...args[0]].sort(
        (left, right) =>
          (compareOrder(left, right) ?? 0) * (args[1] === "desc" ? -1 : 1),
      );
    }
    case "default":
      return args[0] ?? args[1] ?? null;
    case "nonnull":
      return args.filter((value) => value !== null && value !== undefined);
    case "choice":
      return isTruthy(args[0]) ? (args[1] ?? null) : (args[2] ?? null);
    default:
      throw new DataviewEvaluationError(
        `unsupported function \`${expression.name}()\`.`,
      );
  }
}

export function readDataviewField(
  entry: ContentManifestEntry,
  path: readonly string[],
  _manifest?: ContentManifest,
  fields?: Readonly<Record<string, unknown>>,
  task?: DataviewTask,
  buildTime?: Date,
): unknown {
  if (path.length === 0) return undefined;
  const [head, ...rest] = path;
  if (!head) return undefined;
  if (head === "file") return readFileField(entry, rest);

  if (rest.length === 0 && task && TASK_FIELDS.has(head)) {
    return readTaskField(entry, task, head);
  }

  const fromFields = readFields(fields, path);
  if (fromFields !== undefined) return fromFields;

  if (rest.length === 0 && (head === "title" || head === "tags")) {
    if (head === "title") return entry.title;
    return entry.tags;
  }

  const fromFrontmatter = readNested(entry.frontmatter, path);
  if (fromFrontmatter !== undefined) return fromFrontmatter;

  if (rest.length === 0 && buildTime) {
    if (head === "today") return startOfDay(buildTime);
    if (head === "now") return buildTime;
  }

  return undefined;
}

function readFields(
  fields: Readonly<Record<string, unknown>> | undefined,
  path: readonly string[],
): unknown {
  if (!fields) return undefined;
  const direct = fields[path.join(".")];
  if (direct !== undefined) return direct;

  let current: unknown = fields;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readTaskField(
  entry: ContentManifestEntry,
  task: DataviewTask,
  field: string,
): unknown {
  switch (field) {
    case "status":
      return task.status;
    case "checked":
      return task.checked;
    case "completed":
      return task.completed;
    case "fullyCompleted":
      return task.fullyCompleted;
    case "text":
      return task.text;
    case "visual":
      return task.visual;
    case "line":
      return task.line;
    case "lineCount":
      return task.lineCount;
    case "path":
      return `${entry.slug}.md`;
    case "section":
      return task.section;
    case "tags":
      return task.tags;
    case "outlinks":
      return task.outlinks;
    case "children":
      return task.children;
    case "link":
      return task.blockId
        ? `${entry.permalink}#${task.blockId}`
        : entry.permalink;
    case "task":
      return true;
    case "annotated":
      return task.fields.size > 0;
    case "parent":
      return task.parent;
    case "blockId":
      return task.blockId;
    default:
      return undefined;
  }
}

function readFileField(
  entry: ContentManifestEntry,
  path: readonly string[],
): unknown {
  const field = path[0];
  if (!field) return undefined;

  switch (field) {
    case "name":
      return entry.slug.split("/").at(-1) ?? entry.slug;
    case "title":
      return entry.title;
    case "slug":
      return entry.slug;
    case "path":
      return `${entry.slug}.md`;
    case "folder":
      return folderOf(entry.slug);
    case "link":
    case "permalink":
    case "url":
      return entry.permalink;
    case "tags":
    case "etags":
      return entry.tags;
    case "inlinks":
      return entry.backlinks;
    case "outlinks":
      return entry.links.map((link) => link.raw);
    case "size":
      return entry.file?.size;
    case "ctime":
    case "cday":
      return entry.file?.ctime;
    case "mtime":
    case "mday":
      return entry.file?.mtime;
    case "date":
      return (
        entry.frontmatter.date ??
        entry.frontmatter.created ??
        entry.frontmatter.published ??
        entry.frontmatter.updated
      );
    case "created":
      return entry.frontmatter.created;
    case "updated":
      return entry.frontmatter.updated;
    case "published":
      return entry.frontmatter.published;
    case "day": {
      const match = /(\d{4}-\d{2}-\d{2})/.exec(
        entry.slug.split("/").at(-1) ?? "",
      );
      return match ? new Date(`${match[1]}T00:00:00.000Z`) : entry.file?.ctime;
    }
    default:
      return undefined;
  }
}

function readNested(
  value: Record<string, unknown>,
  path: readonly string[],
): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  return true;
}

function compareValues(
  operator: DataviewComparisonOperator,
  left: unknown,
  right: unknown,
): boolean {
  if (operator === "=") return looseEquals(left, right);
  if (operator === "!=") return !looseEquals(left, right);

  const order = compareOrder(left, right);
  if (order === null) return false;
  switch (operator) {
    case ">":
      return order > 0;
    case "<":
      return order < 0;
    case ">=":
      return order >= 0;
    case "<=":
      return order <= 0;
  }
}

function looseEquals(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => looseEquals(item, right[index]));
  }

  if (
    left === null ||
    left === undefined ||
    right === null ||
    right === undefined
  ) {
    return (left ?? null) === (right ?? null);
  }

  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;

  if (typeof leftValue === "boolean" || typeof rightValue === "boolean") {
    return leftValue === rightValue;
  }
  const leftNumber = toNumber(leftValue);
  const rightNumber = toNumber(rightValue);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber === rightNumber;
  }
  return String(leftValue).toLowerCase() === String(rightValue).toLowerCase();
}

function compareOrder(left: unknown, right: unknown): number | null {
  const leftValue = normalizeComparable(left);
  const rightValue = normalizeComparable(right);
  if (leftValue === null || rightValue === null) return null;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  const leftText = String(leftValue).toLowerCase();
  const rightText = String(rightValue).toLowerCase();
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function normalizeComparable(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    if (/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(trimmed)) {
      const time = Date.parse(trimmed);
      if (!Number.isNaN(time)) return time;
    }
    return value;
  }
  return String(value);
}

function arithmetic(
  operator: "+" | "-" | "*" | "/" | "%",
  left: unknown,
  right: unknown,
): unknown {
  if (
    operator === "+" &&
    (typeof left === "string" || typeof right === "string")
  ) {
    return `${String(left ?? "")}${String(right ?? "")}`;
  }

  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber === null || rightNumber === null) return null;

  switch (operator) {
    case "+":
      return leftNumber + rightNumber;
    case "-":
      return leftNumber - rightNumber;
    case "*":
      return leftNumber * rightNumber;
    case "/":
      return rightNumber === 0 ? null : leftNumber / rightNumber;
    case "%":
      return rightNumber === 0 ? null : leftNumber % rightNumber;
  }
}

function negate(value: unknown): unknown {
  const numeric = toNumber(value);
  return numeric === null ? null : -numeric;
}

function containsValue(container: unknown, expected: unknown): boolean {
  if (container === null || container === undefined) return false;

  if (Array.isArray(container)) {
    return container.some((item) => looseTagEquals(item, expected));
  }
  if (typeof container === "string") {
    if (expected === null || expected === undefined) return false;
    return container.toLowerCase().includes(String(expected).toLowerCase());
  }
  return false;
}

function looseTagEquals(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return stripHash(left).toLowerCase() === stripHash(right).toLowerCase();
  }
  return looseEquals(left, right);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "number" && Number.isFinite(value))
    return new Date(value);
  if (typeof value !== "string") return null;
  const time = Date.parse(value.trim());
  return Number.isNaN(time) ? null : new Date(time);
}

/** Parse a value into a millisecond timestamp, or `null` when impossible. */
export function toDataviewTime(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value.trim());
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDateValue(value: unknown, format: unknown): string | null {
  const date = toDate(value);
  if (!date) return null;
  const pattern = typeof format === "string" ? format : "yyyy-MM-dd";
  const pad = (part: number) => String(part).padStart(2, "0");
  return pattern
    .replace(/yyyy/g, String(date.getUTCFullYear()))
    .replace(/MM/g, pad(date.getUTCMonth() + 1))
    .replace(/dd/g, pad(date.getUTCDate()))
    .replace(/HH/g, pad(date.getUTCHours()))
    .replace(/mm/g, pad(date.getUTCMinutes()))
    .replace(/ss/g, pad(date.getUTCSeconds()));
}

function lengthOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return null;
}

function roundValue(
  value: unknown,
  precision: unknown,
  round: (value: number) => number,
): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  const digits = toNumber(precision) ?? 0;
  const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)));
  return round(numeric * factor) / factor;
}

function aggregate(
  args: unknown[],
  combine: (values: number[]) => number,
): number | null {
  const values = numericValues(args);
  return values.length === 0 ? null : combine(values);
}

function numericValues(args: unknown[]): number[] {
  const source = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return source
    .map(toNumber)
    .filter((value): value is number => value !== null);
}

function textStartsWith(
  value: unknown,
  prefix: unknown,
  starts: boolean,
): boolean {
  if (typeof value !== "string") return false;
  const text = String(prefix ?? "");
  return starts ? value.startsWith(text) : value.endsWith(text);
}

function sortRows(
  rows: DataviewRow[],
  sort: readonly DataviewSort[],
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewRow[] {
  return [...rows].sort((left, right) => {
    for (const key of sort) {
      const expression: DataviewExpression = key.expression ?? {
        kind: "field",
        path: key.field.split("."),
      };
      const leftValue = evaluateDataviewExpression(
        expression,
        scopeOf(left, manifest, buildTime),
      );
      const rightValue = evaluateDataviewExpression(
        expression,
        scopeOf(right, manifest, buildTime),
      );

      if (leftValue === undefined && rightValue === undefined) continue;
      if (leftValue === undefined) return 1;
      if (rightValue === undefined) return -1;

      const order = compareOrder(leftValue, rightValue);
      if (order === null) continue;
      if (order !== 0) return key.order === "desc" ? -order : order;
    }
    return 0;
  });
}

function scopeOf(
  row: DataviewRow,
  manifest: ContentManifest,
  buildTime: Date | undefined,
): DataviewScope {
  return {
    entry: row.entry,
    manifest,
    fields: row.fields,
    task: row.task,
    buildTime,
  };
}

function toGroup(row: DataviewRow): DataviewGroup {
  const rows = row.group?.rows ?? [row];
  return {
    key: row.group?.key ?? "",
    entries: uniqueEntries(rows),
    rows,
  };
}

function uniqueEntries(rows: readonly DataviewRow[]): ContentManifestEntry[] {
  const seen = new Set<string>();
  const entries: ContentManifestEntry[] = [];
  for (const row of rows) {
    if (seen.has(row.entry.slug)) continue;
    seen.add(row.entry.slug);
    entries.push(row.entry);
  }
  return entries;
}

function legacyCommands(spec: DataviewSpec): DataviewCommand[] {
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

export function formatGroupKey(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString().slice(0, 10)
      : "(none)";
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

function startOfDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function stripHash(value: string): string {
  return value.startsWith("#") ? value.slice(1) : value;
}

function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function folderOf(slug: string): string {
  const index = slug.lastIndexOf("/");
  return index < 0 ? "" : slug.slice(0, index);
}
