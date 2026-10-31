import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { PostFrontmatter } from "../types/post_content.js";
import { applyContentMigrationRule } from "./migration_rules.js";
import type {
  ContentMigration,
  ContentMigrationDiagnostic,
  MigrationContent,
} from "./migration_types.js";

export type MigrationContentState = {
  readonly path: string;
  readonly markdown: string;
  readonly frontmatter: Readonly<PostFrontmatter>;
};

export type ParsedMigrationContent = {
  readonly content?: MigrationContentState;
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
};

export type MigrationContentApplication = {
  readonly content: MigrationContentState;
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly selected: boolean;
};

export function parseMigrationContent(
  path: string,
  markdown: string,
): ParsedMigrationContent {
  const file = new VFile({ value: markdown });
  try {
    matter(file);
  } catch (error) {
    return {
      diagnostics: [
        {
          severity: "error",
          code: "frontmatter-parse-failed",
          message: `Cannot parse frontmatter: ${errorMessage(error)}`,
          path,
        },
      ],
    };
  }
  const parsed = file.data.matter;
  if (parsed !== undefined && !isRecord(parsed))
    return {
      diagnostics: [
        {
          severity: "error",
          code: "frontmatter-not-object",
          message: "Frontmatter must be a mapping.",
          path,
        },
      ],
    };
  return {
    content: {
      path,
      markdown,
      frontmatter: (parsed ?? {}) as PostFrontmatter,
    },
    diagnostics: [],
  };
}

export function applyContentMigration(
  content: MigrationContent,
  migration: ContentMigration,
): MigrationContentApplication {
  const diagnostics: ContentMigrationDiagnostic[] = [];
  let selected = false;
  try {
    selected = migration.select(content);
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "migration-select-failed",
      message: `Migration "${migration.id}" failed to select content: ${errorMessage(error)}`,
      path: content.path,
    });
  }
  if (!selected) return { content, diagnostics, selected: false };

  const frontmatter = { ...content.frontmatter };
  let path = content.path;
  for (const rule of migration.rules) {
    const input = {
      content: snapshot(content, path, frontmatter),
      frontmatter,
      path,
    };
    diagnostics.push(...applyContentMigrationRule(rule, input));
    path = input.path;
    if (path !== content.path && !isSafeContentPath(path))
      diagnostics.push({
        severity: "error",
        code: "invalid-content-path",
        message: `Migration "${migration.id}" produced an unsafe content path.`,
        path: content.path,
      });
  }

  if (migration.transform) {
    try {
      const result = migration.transform(snapshot(content, path, frontmatter));
      for (const key of result.remove ?? []) delete frontmatter[key];
      for (const [key, value] of Object.entries(result.set ?? {}))
        frontmatter[key] = value;
      if (result.path !== undefined && result.path !== path) {
        if (isSafeContentPath(result.path)) path = result.path;
        else
          diagnostics.push({
            severity: "error",
            code: "invalid-content-path",
            message: `Migration "${migration.id}" produced an unsafe content path.`,
            path,
          });
      }
      diagnostics.push(...(result.diagnostics ?? []));
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "migration-transform-failed",
        message: `Migration "${migration.id}" failed: ${errorMessage(error)}`,
        path,
      });
    }
  }

  const transformed: MigrationContentState = {
    path,
    markdown: content.markdown,
    frontmatter,
  };

  if (migration.validate) {
    try {
      diagnostics.push(...migration.validate(transformed));
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "migration-validation-failed",
        message: `Migration "${migration.id}" failed to validate: ${errorMessage(error)}`,
        path,
      });
    }
  }

  return { content: transformed, diagnostics, selected: true };
}

export function diffFrontmatter(
  before: Readonly<PostFrontmatter>,
  after: Readonly<Record<string, unknown>>,
): {
  readonly set: Readonly<Record<string, unknown>>;
  readonly remove: readonly string[];
} {
  const set: Record<string, unknown> = {};
  const remove: string[] = [];
  for (const [key, value] of Object.entries(after)) {
    if (!(key in before) || !deepEqual(before[key], value)) set[key] = value;
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) remove.push(key);
  }
  return { set, remove: remove.sort() };
}

export function isSafeContentPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\\")) return false;
  const segments = path.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    return false;
  return /\.md$/iu.test(path);
}

function snapshot(
  content: MigrationContent,
  path: string,
  frontmatter: Record<string, unknown>,
): MigrationContent {
  return {
    path,
    markdown: content.markdown,
    frontmatter,
  };
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
