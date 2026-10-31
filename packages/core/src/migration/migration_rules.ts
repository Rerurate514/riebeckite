import type {
  ContentMigrationDiagnostic,
  MigrationContent,
} from "./migration_types.js";

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

export function applyContentMigrationRule(
  rule: ContentMigrationRule,
  input: ContentMigrationTransformInput,
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
      applyPermalinkRule(rule, input, diagnostics);
      return diagnostics;
    case "path-rename":
      applyPathRenameRule(rule, input, diagnostics);
      return diagnostics;
    default:
      return diagnostics;
  }
}

function tryGetRuleValue(
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

function safeRuleCondition(
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

function setFrontmatterValue(
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

function renameFrontmatterValue(
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

function normalizeFrontmatterList(
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

function mapFrontmatterValue(
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

function appendFrontmatterValue(
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

function applyPermalinkRule(
  rule: PermalinkRule,
  input: ContentMigrationTransformInput,
  diagnostics: ContentMigrationDiagnostic[],
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
    appendUnique(input.frontmatter, "redirect_from", previous);
}

function applyPathRenameRule(
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

function appendUnique(
  frontmatter: Record<string, unknown>,
  key: string,
  value: string,
): void {
  const current = frontmatter[key];
  const values = Array.isArray(current)
    ? [...current]
    : current === undefined || current === null
      ? []
      : [current];
  if (!values.includes(value)) values.push(value);
  frontmatter[key] = values;
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
