import type { ContentMigrationRule } from "./migration_rules.js";

export const MIGRATION_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;

export const FRONTMATTER_KEY = /^[^\s:]+$/u;

export const RULE_KINDS = new Set<ContentMigrationRule["kind"]>([
  "frontmatter-set",
  "frontmatter-remove",
  "frontmatter-rename",
  "frontmatter-normalize-list",
  "frontmatter-map",
  "frontmatter-append",
  "visibility",
  "content-id",
  "permalink",
  "path-rename",
]);
