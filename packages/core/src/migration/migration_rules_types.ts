import type { MigrationContent } from "./migration_types.js";

export type ContentMigrationRuleCondition = (
  content: MigrationContent,
) => boolean;

export type ContentMigrationRuleValue =
  | unknown
  | ((content: MigrationContent) => unknown);

export type FrontmatterSetRule = {
  readonly kind: "frontmatter-set";
  readonly key: string;
  readonly value: ContentMigrationRuleValue;
  readonly when?: ContentMigrationRuleCondition;
};

export type FrontmatterRemoveRule = {
  readonly kind: "frontmatter-remove";
  readonly key: string;
  readonly when?: ContentMigrationRuleCondition;
};

export type FrontmatterRenameRule = {
  readonly kind: "frontmatter-rename";
  readonly from: string;
  readonly to: string;
  readonly when?: ContentMigrationRuleCondition;
};

export type FrontmatterNormalizeListRule = {
  readonly kind: "frontmatter-normalize-list";
  readonly key: string;
  readonly separator?: RegExp;
  readonly when?: ContentMigrationRuleCondition;
};

export type FrontmatterMapRule = {
  readonly kind: "frontmatter-map";
  readonly key: string;
  readonly map: (
    value: unknown,
    content: MigrationContent,
  ) => unknown | undefined;
  readonly when?: ContentMigrationRuleCondition;
};

export type FrontmatterAppendRule = {
  readonly kind: "frontmatter-append";
  readonly key: string;
  readonly value: ContentMigrationRuleValue;
  readonly unique?: boolean;
  readonly when?: ContentMigrationRuleCondition;
};

export type VisibilityRule = {
  readonly kind: "visibility";
  readonly visibility: "public" | "unlisted" | "draft";
  readonly when?: ContentMigrationRuleCondition;
};

export type ContentIdRule = {
  readonly kind: "content-id";
  readonly id: string | ((content: MigrationContent) => string);
  readonly when?: ContentMigrationRuleCondition;
};

export type PermalinkRule = {
  readonly kind: "permalink";
  readonly permalink: string | ((content: MigrationContent) => string);
  readonly preservePrevious?: boolean;
  readonly when?: ContentMigrationRuleCondition;
};

export type PathRenameRule = {
  readonly kind: "path-rename";
  readonly from: string;
  readonly to: string;
  readonly when?: ContentMigrationRuleCondition;
};

export type ContentMigrationRule =
  | FrontmatterSetRule
  | FrontmatterRemoveRule
  | FrontmatterRenameRule
  | FrontmatterNormalizeListRule
  | FrontmatterMapRule
  | FrontmatterAppendRule
  | VisibilityRule
  | ContentIdRule
  | PermalinkRule
  | PathRenameRule;

export type ContentMigrationTransformInput = {
  readonly content: MigrationContent;
  frontmatter: Record<string, unknown>;
  path: string;
};

export type ContentMigrationRuleOptions = {
  readonly redirectField?: string;
};
