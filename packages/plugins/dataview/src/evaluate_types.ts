import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import type { InlineFields } from "./inline_fields.js";
import type { DataviewTask } from "./tasks.js";

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

export const TASK_FIELDS = new Set([
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
