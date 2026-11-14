import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { type DataviewNote, TASK_FIELDS } from "./evaluate_types.js";
import { folderOf, startOfDay } from "./evaluate_util.js";
import type { DataviewTask } from "./tasks.js";

export function noteFields(
  note: DataviewNote | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!note) return undefined;
  return Object.fromEntries(note.fields);
}

export function taskInlineFields(task: DataviewTask): Record<string, unknown> {
  return Object.fromEntries(task.fields);
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

export function readFields(
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

export function readTaskField(
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

export function readFileField(
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

export function readNested(
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
