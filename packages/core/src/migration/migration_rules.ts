import {
  appendFrontmatterValue,
  mapFrontmatterValue,
  normalizeFrontmatterList,
  renameFrontmatterValue,
  safeRuleCondition,
  setFrontmatterValue,
} from "./migration_rules_frontmatter.js";
import {
  applyPathRenameRule,
  applyPermalinkRule,
} from "./migration_rules_paths.js";
import type {
  ContentMigrationRule,
  ContentMigrationRuleOptions,
  ContentMigrationTransformInput,
} from "./migration_rules_types.js";
import type { ContentMigrationDiagnostic } from "./migration_types.js";

export type * from "./migration_rules_types.js";

export function applyContentMigrationRule(
  rule: ContentMigrationRule,
  input: ContentMigrationTransformInput,
  options: ContentMigrationRuleOptions = {},
): ContentMigrationDiagnostic[] {
  const diagnostics: ContentMigrationDiagnostic[] = [];
  if (rule.when && !safeRuleCondition(rule.when, input.content, diagnostics))
    return diagnostics;

  switch (rule.kind) {
    case "frontmatter-set":
      setFrontmatterValue(rule, input, diagnostics);
      return diagnostics;
    case "frontmatter-remove":
      delete input.frontmatter[rule.key];
      return diagnostics;
    case "frontmatter-rename":
      renameFrontmatterValue(rule, input, diagnostics);
      return diagnostics;
    case "frontmatter-normalize-list":
      normalizeFrontmatterList(rule, input, diagnostics);
      return diagnostics;
    case "frontmatter-map":
      mapFrontmatterValue(rule, input, diagnostics);
      return diagnostics;
    case "frontmatter-append":
      appendFrontmatterValue(rule, input, diagnostics);
      return diagnostics;
    case "visibility":
      input.frontmatter.visibility = rule.visibility;
      return diagnostics;
    case "content-id":
      setFrontmatterValue(
        { kind: "frontmatter-set", key: "id", value: rule.id },
        input,
        diagnostics,
      );
      return diagnostics;
    case "permalink":
      applyPermalinkRule(rule, input, diagnostics, options);
      return diagnostics;
    case "path-rename":
      applyPathRenameRule(rule, input, diagnostics);
      return diagnostics;
    default:
      return diagnostics;
  }
}
