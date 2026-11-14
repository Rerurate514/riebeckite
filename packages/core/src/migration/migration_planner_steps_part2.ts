import type { ContentMutationOperation } from "../content/content_mutation.js";
import type { ContentMigrationFileDiff } from "./migration_planner.js";
import type { WorkingFile } from "./migration_planner_steps_part1.js";
import { diffFrontmatter } from "./migration_transform.js";
import type { MigrationContent } from "./migration_types.js";

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

export function contentOf(file: WorkingFile): MigrationContent {
  return {
    path: file.path,
    markdown: file.markdown,
    frontmatter: file.frontmatter,
  };
}

export function frontmatterChanged(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): boolean {
  return (
    Object.keys(before).length !== Object.keys(after).length ||
    Object.keys(before).some((key) => !(key in after)) ||
    Object.keys(after).some((key) => !deepEqual(before[key], after[key]))
  );
}

export function appendRedirect(
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

export function orderMoves(
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

export function deepEqual(left: unknown, right: unknown): boolean {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
