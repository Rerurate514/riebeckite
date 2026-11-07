import type { ContentMutationOperation } from "../content/content_mutation.js";
import type { PostFrontmatter } from "../types/post_content.js";
import {
  applyMigrations,
  buildOperations,
  loadWorkingFiles,
  orderWorkingFiles,
  planMoves,
  preserveMovedPermalinks,
  reportPathCollisions,
} from "./migration_planner_steps.js";
import type {
  ContentMigration,
  ContentMigrationDiagnostic,
  MigrationContent,
} from "./migration_types.js";

export type ContentMigrationPlannerFile = {
  readonly path: string;
  readonly content: string | Uint8Array;
};

export type ContentMigrationPlannerOptions = {
  readonly migrations: readonly ContentMigration[];
  readonly files: readonly ContentMigrationPlannerFile[];
  readonly beforePermalinks?: ReadonlyMap<string, string>;
  readonly preserveMovedPermalinks?: boolean;
  readonly redirectField?: string;
};

export type ContentMigrationSelection = {
  readonly migrationId: string;
  readonly version: number;
  readonly paths: readonly string[];
};

export type ContentMigrationSkip = {
  readonly migrationId: string;
  readonly version: number;
  readonly reason: "no-selection" | "no-change";
};

export type ContentMigrationFileDiff = {
  readonly path: string;
  readonly from?: string;
  readonly frontmatterKeys: readonly string[];
};

export type ContentMigrationPlannedFile = MigrationContent & {
  readonly originalPath: string;
  readonly originalFrontmatter: Readonly<PostFrontmatter>;
};

export type ContentMigrationBatch = {
  readonly operations: readonly ContentMutationOperation[];
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly selections: readonly ContentMigrationSelection[];
  readonly skipped: readonly ContentMigrationSkip[];
  readonly files: readonly ContentMigrationPlannedFile[];
  readonly diffs: readonly ContentMigrationFileDiff[];
  readonly impact: {
    readonly files: number;
    readonly moved: number;
    readonly frontmatter: number;
    readonly created: number;
    readonly deleted: number;
  };
};

export function planContentMigrationBatch(
  options: ContentMigrationPlannerOptions,
): ContentMigrationBatch {
  const diagnostics: ContentMigrationDiagnostic[] = [];
  const redirectField = options.redirectField ?? "redirect_from";

  const files = loadWorkingFiles(options.files, diagnostics);
  const { selections, skipped } = applyMigrations(
    files,
    options.migrations,
    redirectField,
    diagnostics,
  );
  const ordered = orderWorkingFiles(files);
  reportPathCollisions(ordered, diagnostics);
  const { moves, moveOrder } = planMoves(ordered, diagnostics);
  preserveMovedPermalinks(ordered, options, redirectField);
  const { operations, diffs, impact } = buildOperations(
    ordered,
    moves,
    moveOrder,
  );

  return {
    operations,
    diagnostics,
    selections,
    skipped,
    files: ordered.map((file) => ({
      path: file.path,
      originalPath: file.originalPath,
      markdown: file.markdown,
      frontmatter: file.frontmatter,
      originalFrontmatter: file.originalFrontmatter,
    })),
    diffs,
    impact,
  };
}
