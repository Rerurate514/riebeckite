import type {
  ContentMigrationRuleOptions,
  ContentMigrationTransformInput,
  PathRenameRule,
  PermalinkRule,
} from "./migration_rules_types.js";
import { appendUnique, errorMessage } from "./migration_rules_util.js";
import type { ContentMigrationDiagnostic } from "./migration_types.js";

export function applyPermalinkRule(
  rule: PermalinkRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
  options: ContentMigrationRuleOptions,
): void {
  let next: string;
  try {
    next =
      typeof rule.permalink === "function"
        ? rule.permalink(input.content)
        : rule.permalink;
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "migration-rule-failed",
      message: `Permalink rule failed: ${errorMessage(error)}`,
      path: input.path,
    });
    return;
  }
  if (typeof next !== "string" || !next.startsWith("/")) {
    diagnostics.push({
      severity: "error",
      code: "invalid-permalink",
      message: "Permalink must start with a slash.",
      path: input.path,
    });
    return;
  }
  const previous =
    typeof input.frontmatter.permalink === "string"
      ? input.frontmatter.permalink
      : undefined;
  input.frontmatter.permalink = next;
  if (rule.preservePrevious !== false && previous && previous !== next)
    appendUnique(
      input.frontmatter,
      options.redirectField ?? "redirect_from",
      previous,
    );
}

export function applyPathRenameRule(
  rule: PathRenameRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  const from = rule.from.replace(/\/+$/u, "");
  const to = rule.to.replace(/\/+$/u, "");
  if (!from || !to || from.startsWith("/") || to.startsWith("/")) {
    diagnostics.push({
      severity: "error",
      code: "invalid-path-rename",
      message: "Path rename rules require relative, non-empty paths.",
      path: input.path,
    });
    return;
  }
  if (input.path === from) input.path = to;
  else if (input.path.startsWith(`${from}/`))
    input.path = `${to}${input.path.slice(from.length)}`;
}
