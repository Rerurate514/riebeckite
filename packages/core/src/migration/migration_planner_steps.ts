import type { ContentMutationOperation } from "../content/content_mutation.js";
import type { PostFrontmatter } from "../types/post_content.js";
import type {
  ContentMigrationFileDiff,
  ContentMigrationPlannerFile,
  ContentMigrationPlannerOptions,
  ContentMigrationSelection,
  ContentMigrationSkip,
} from "./migration_planner.js";
import {
  applyContentMigration,
  diffFrontmatter,
  parseMigrationContent,
} from "./migration_transform.js";
import type {
  ContentMigration,
  ContentMigrationDiagnostic,
  MigrationContent,
} from "./migration_types.js";

export type WorkingFile = {
  readonly originalPath: string;
  readonly markdown: string;
  readonly originalFrontmatter: Readonly<PostFrontmatter>;
  path: string;
  frontmatter: Record<string, unknown>;
};

const decoder = new TextDecoder("utf-8", { fatal: true });

export function loadWorkingFiles(
  files: readonly ContentMigrationPlannerFile[],
  diagnostics: ContentMigrationDiagnostic[],
): Map<string, WorkingFile> {
  const working = new Map<string, WorkingFile>();
  for (const file of files) {
    if (!file.path.toLowerCase().endsWith(".md")) continue;
    let markdown: string;
    try {
      markdown =
        typeof file.content === "string"
          ? file.content
          : decoder.decode(file.content);
    } catch {
      diagnostics.push({
        severity: "error",
        code: "invalid-markdown-encoding",
        message: "The Markdown file is not valid UTF-8.",
        path: file.path,
      });
      continue;
    }
    const parsed = parseMigrationContent(file.path, markdown);
    diagnostics.push(...parsed.diagnostics);
    if (!parsed.content) continue;
    working.set(file.path, {
      originalPath: file.path,
      markdown,
      originalFrontmatter: parsed.content.frontmatter,
      path: file.path,
      frontmatter: { ...parsed.content.frontmatter },
    });
  }
  return working;
}

export function applyMigrations(
  files: Map<string, WorkingFile>,
  migrations: readonly ContentMigration[],
  redirectField: string,
  diagnostics: ContentMigrationDiagnostic[],
): {
  selections: ContentMigrationSelection[];
  skipped: ContentMigrationSkip[];
} {
  const selections: ContentMigrationSelection[] = [];
  const skipped: ContentMigrationSkip[] = [];
  for (const migration of migrations) {
    const selectedPaths: string[] = [];
    let changed = false;
    const snapshot = [...files.values()].sort((left, right) =>
      left.path.localeCompare(right.path),
    );
    for (const file of snapshot) {
      const content = contentOf(file);
      const application = applyContentMigration(content, migration, {
        redirectField,
      });
      diagnostics.push(...application.diagnostics);
      if (!application.selected) continue;
      selectedPaths.push(file.originalPath);
      const next = application.content;
      if (
        next.path === file.path &&
        !frontmatterChanged(file.frontmatter, next.frontmatter)
      )
        continue;
      file.path = next.path;
      file.frontmatter = { ...next.frontmatter };
      changed = true;
    }
    if (selectedPaths.length > 0)
      selections.push({
        migrationId: migration.id,
        version: migration.version,
        paths: selectedPaths.sort(),
      });
    else
      skipped.push({
        migrationId: migration.id,
        version: migration.version,
        reason: "no-selection",
      });
    if (selectedPaths.length > 0 && !changed)
      skipped.push({
        migrationId: migration.id,
        version: migration.version,
        reason: "no-change",
      });
  }
  return { selections, skipped };
}

export function orderWorkingFiles(
  files: Map<string, WorkingFile>,
): WorkingFile[] {
  return [...files.values()].sort((left, right) =>
    left.originalPath.localeCompare(right.originalPath),
  );
}

export function reportPathCollisions(
  ordered: readonly WorkingFile[],
  diagnostics: ContentMigrationDiagnostic[],
): void {
  const byFinalPath = new Map<string, WorkingFile[]>();
  for (const file of ordered) {
    const key = file.path.toLowerCase();
    const list = byFinalPath.get(key) ?? [];
    list.push(file);
    byFinalPath.set(key, list);
  }
  for (const [key, list] of byFinalPath) {
    if (list.length < 2) continue;
    diagnostics.push({
      severity: "error",
      code: "path-collision",
      message: `Multiple files resolve to the same content path "${key}".`,
      path: key,
    });
  }
}

export function planMoves(
  ordered: readonly WorkingFile[],
  diagnostics: ContentMigrationDiagnostic[],
): {
  moves: Map<string, string>;
  moveOrder: readonly string[] | undefined;
} {
  const moves = new Map<string, string>();
  for (const file of ordered) {
    if (file.originalPath !== file.path)
      moves.set(file.originalPath, file.path);
  }
  const moveOrder = orderMoves(
    moves,
    new Set(ordered.map((file) => file.originalPath)),
  );
  if (moveOrder === undefined) {
    diagnostics.push({
      severity: "error",
      code: "path-cycle",
      message:
        "Content path moves form a cycle and cannot be applied in order.",
    });
  }
  return { moves, moveOrder };
}

export function preserveMovedPermalinks(
  ordered: readonly WorkingFile[],
  options: ContentMigrationPlannerOptions,
  redirectField: string,
): void {
  for (const file of ordered) {
    if (file.originalPath === file.path) continue;
    if (options.preserveMovedPermalinks === false) continue;
    const beforePermalink = options.beforePermalinks?.get(file.originalPath);
    if (
      beforePermalink !== undefined &&
      file.frontmatter.permalink !== beforePermalink
    ) {
      appendRedirect(file.frontmatter, redirectField, beforePermalink);
    }
  }
}

export function buildOperations(
  ordered: readonly WorkingFile[],
  moves: ReadonlyMap<string, string>,
  moveOrder: readonly string[] | undefined,
): {
  operations: ContentMutationOperation[];
  diffs: ContentMigrationFileDiff[];
  impact: {
    files: number;
    moved: number;
    frontmatter: number;
    created: number;
    deleted: number;
  };
} {
  const operations: ContentMutationOperation[] = [];
  const diffs: ContentMigrationFileDiff[] = [];
  let moved = 0;
  let frontmatter = 0;
  const changedFiles = new Set<string>();
  for (const from of moveOrder ?? []) {
    const to = moves.get(from);
    if (to === undefined) continue;
    operations.push({ kind: "move", from, to });
    changedFiles.add(from);
    moved += 1;
  }
  for (const file of ordered) {
    const diff = diffFrontmatter(file.originalFrontmatter, file.frontmatter);
    const keys = [...Object.keys(diff.set), ...diff.remove].sort();
    if (keys.length === 0) continue;
    changedFiles.add(file.originalPath);
    operations.push({
      kind: "frontmatter",
      path: file.path,
      set: diff.set,
      remove: diff.remove,
    });
    diffs.push({
      path: file.originalPath,
      from: file.originalPath === file.path ? undefined : file.path,
      frontmatterKeys: keys,
    });
    frontmatter += 1;
  }
  return {
    operations,
    diffs,
    impact: {
      files: changedFiles.size,
      moved,
      frontmatter,
      created: 0,
      deleted: 0,
    },
  };
}

function contentOf(file: WorkingFile): MigrationContent {
  return {
    path: file.path,
    markdown: file.markdown,
    frontmatter: file.frontmatter,
  };
}

function frontmatterChanged(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): boolean {
  return (
    Object.keys(before).length !== Object.keys(after).length ||
    Object.keys(before).some((key) => !(key in after)) ||
    Object.keys(after).some((key) => !deepEqual(before[key], after[key]))
  );
}

function appendRedirect(
  frontmatter: Record<string, unknown>,
  field: string,
  value: string,
): void {
  const current = frontmatter[field];
  const entries =
    typeof current === "string"
      ? [current]
      : Array.isArray(current)
        ? current.filter((entry): entry is string => typeof entry === "string")
        : [];
  if (entries.includes(value)) return;
  frontmatter[field] = [...entries, value];
}

function orderMoves(
  moves: ReadonlyMap<string, string>,
  originals: ReadonlySet<string>,
): readonly string[] | undefined {
  const ordered: string[] = [];
  const remaining = new Set(moves.keys());
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((from) => {
        const to = moves.get(from);
        return to === undefined || !originals.has(to) || !remaining.has(to);
      })
      .sort((left, right) => left.localeCompare(right));
    if (ready.length === 0) return undefined;
    for (const from of ready) {
      ordered.push(from);
      remaining.delete(from);
    }
  }
  return ordered;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date && right instanceof Date)
    return left.getTime() === right.getTime();
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => key in right && deepEqual(left[key], right[key]))
    );
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
