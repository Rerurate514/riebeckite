import type { PostFrontmatter } from "../types/post_content.js";

export type ContentMigrationDiagnostic = {
  readonly severity: "error" | "warning" | "info";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
};

export type MigrationContent = {
  readonly path: string;
  readonly markdown: string;
  readonly frontmatter: Readonly<PostFrontmatter>;
};

export type ContentMigrationSelector = (content: MigrationContent) => boolean;

export type ContentMigrationTransformResult = {
  readonly set?: Readonly<Record<string, unknown>>;
  readonly remove?: readonly string[];
  readonly path?: string;
  readonly diagnostics?: readonly ContentMigrationDiagnostic[];
};

export type ContentMigrationTransform = (
  content: MigrationContent,
) => ContentMigrationTransformResult;

export type ContentMigrationValidator = (
  content: MigrationContent,
) => readonly ContentMigrationDiagnostic[];

export type ContentMigrationReversible = {
  readonly description: string;
};

export type ContentMigrationDefinition = {
  readonly id: string;
  readonly version: number;
  readonly description: string;
  readonly dependsOn?: readonly string[];
  readonly select?: ContentMigrationSelector;
  readonly rules?: readonly import("./migration_rules.js").ContentMigrationRule[];
  readonly transform?: ContentMigrationTransform;
  readonly validate?: ContentMigrationValidator;
  readonly reversible?: ContentMigrationReversible | false;
};

export type ContentMigration = {
  readonly id: string;
  readonly version: number;
  readonly description: string;
  readonly dependsOn: readonly string[];
  readonly select: ContentMigrationSelector;
  readonly rules: readonly import("./migration_rules.js").ContentMigrationRule[];
  readonly transform?: ContentMigrationTransform;
  readonly validate?: ContentMigrationValidator;
  readonly reversible?: ContentMigrationReversible;
  readonly fingerprint: string;
};
