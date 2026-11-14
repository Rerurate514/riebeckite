import type { PostFrontmatter } from "../types/post_content.js";
import type {
  ContentMigrationPlannerFile,
  ContentMigrationPlannerOptions,
  ContentMigrationSelection,
  ContentMigrationSkip,
} from "./migration_planner.js";
import {
  appendRedirect,
  contentOf,
  frontmatterChanged,
  orderMoves,
} from "./migration_planner_steps_part2.js";
import {
  applyContentMigration,
  parseMigrationContent,
} from "./migration_transform.js";
import type {
  ContentMigration,
  ContentMigrationDiagnostic,
} from "./migration_types.js";

export type WorkingFile = {
  readonly originalPath: string;
  readonly markdown: string;
  readonly originalFrontmatter: Readonly<PostFrontmatter>;
  path: string;
  frontmatter: Record<string, unknown>;
};

export const decoder = new TextDecoder("utf-8", { fatal: true });

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
