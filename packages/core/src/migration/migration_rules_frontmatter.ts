import type {
  ContentMigrationRuleCondition,
  ContentMigrationRuleValue,
  ContentMigrationTransformInput,
  FrontmatterAppendRule,
  FrontmatterMapRule,
  FrontmatterNormalizeListRule,
  FrontmatterRenameRule,
  FrontmatterSetRule,
} from "./migration_rules_types.js";
import { deepEqual, errorMessage } from "./migration_rules_util.js";
import type {
  ContentMigrationDiagnostic,
  MigrationContent,
} from "./migration_types.js";

export function tryGetRuleValue(
  value: ContentMigrationRuleValue,
  content: MigrationContent,
  diagnostics: ContentMigrationDiagnostic[],
  path: string,
  key: string,
): { readonly ok: boolean; readonly value?: unknown } {
  if (typeof value !== "function") return { ok: true, value };
  try {
    return {
      ok: true,
      value: (value as (content: MigrationContent) => unknown)(content),
    };
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "migration-rule-failed",
      message: `Rule for "${key}" failed: ${errorMessage(error)}`,
      path,
    });
    return { ok: false };
  }
}

export function safeRuleCondition(
  condition: ContentMigrationRuleCondition,
  content: MigrationContent,
  diagnostics: ContentMigrationDiagnostic[],
): boolean {
  try {
    return condition(content);
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "migration-condition-failed",
      message: `Migration condition failed: ${errorMessage(error)}`,
      path: content.path,
    });
    return false;
  }
}

export function setFrontmatterValue(
  rule: FrontmatterSetRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  const resolved = tryGetRuleValue(
    rule.value,
    input.content,
    diagnostics,
    input.path,
    rule.key,
  );
  if (!resolved.ok) return;
  if (resolved.value === undefined) {
    delete input.frontmatter[rule.key];
    return;
  }
  input.frontmatter[rule.key] = resolved.value;
}

export function renameFrontmatterValue(
  rule: FrontmatterRenameRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  if (!(rule.from in input.frontmatter)) return;
  if (rule.to in input.frontmatter) {
    diagnostics.push({
      severity: "warning",
      code: "frontmatter-rename-target-exists",
      message: `Cannot rename "${rule.from}" to "${rule.to}" because the target already exists.`,
      path: input.path,
    });
    return;
  }
  input.frontmatter[rule.to] = input.frontmatter[rule.from];
  delete input.frontmatter[rule.from];
}

export function normalizeFrontmatterList(
  rule: FrontmatterNormalizeListRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  if (!(rule.key in input.frontmatter)) return;
  const value = input.frontmatter[rule.key];
  const items = Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string" ? item.split(rule.separator ?? /[\s,]+/u) : [],
      )
    : typeof value === "string"
      ? value.split(rule.separator ?? /[\s,]+/u)
      : undefined;
  if (items === undefined) {
    diagnostics.push({
      severity: "error",
      code: "frontmatter-list-unsupported",
      message: `Cannot normalize "${rule.key}" because its value is not a string or array.`,
      path: input.path,
    });
    return;
  }
  const normalized: string[] = [];
  for (const item of items) {
    const tag = item.replace(/^#+/u, "").trim();
    if (tag && !normalized.includes(tag)) normalized.push(tag);
  }
  input.frontmatter[rule.key] = normalized;
}

export function mapFrontmatterValue(
  rule: FrontmatterMapRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  if (!(rule.key in input.frontmatter)) return;
  try {
    const value = rule.map(input.frontmatter[rule.key], input.content);
    if (value === undefined) delete input.frontmatter[rule.key];
    else input.frontmatter[rule.key] = value;
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "migration-rule-failed",
      message: `Rule for "${rule.key}" failed: ${errorMessage(error)}`,
      path: input.path,
    });
  }
}

export function appendFrontmatterValue(
  rule: FrontmatterAppendRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
): void {
  const resolved = tryGetRuleValue(
    rule.value,
    input.content,
    diagnostics,
    input.path,
    rule.key,
  );
  if (!resolved.ok || resolved.value === undefined) return;
  const current = input.frontmatter[rule.key];
  const values = Array.isArray(current)
    ? [...current]
    : current === undefined || current === null
      ? []
      : [current];
  if (rule.unique === false) values.push(resolved.value);
  else if (!values.some((item) => deepEqual(item, resolved.value)))
    values.push(resolved.value);
  input.frontmatter[rule.key] = values;
}
