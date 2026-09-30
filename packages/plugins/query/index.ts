import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkQuery } from "./src/remark.js";
import { createQueryRuntime } from "./src/runtime.js";
import type { QueryOptions } from "./src/types.js";

export { queryContentEntries } from "@riebeckite/core";
export { remarkQuery } from "./src/remark.js";
export type {
  QueryOptions,
  QueryOutputFormat,
  QuerySpec,
} from "./src/types.js";

export function queryPlugin(options: QueryOptions = {}) {
  const language = options.language ?? "query";
  const runtime = createQueryRuntime(options);

  return definePlugin({
    name: "query",
    options,
    provides: ["content.query"],
    validateOptions: validateQueryOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkQuery, { language });
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics);
    },
    assets: [createStyleAsset("query")],
  });
}

function validateQueryOptions(
  options: QueryOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  if (
    options.language !== undefined &&
    (typeof options.language !== "string" || options.language.trim() === "")
  ) {
    issues.push({ path: "language", message: "Expected a non-empty string." });
  }
  if (!isFormat(options.defaultFormat)) {
    issues.push({
      path: "defaultFormat",
      message: 'Expected "table" or "list".',
    });
  }
  if (!isColumnList(options.defaultColumns)) {
    issues.push({
      path: "defaultColumns",
      message: "Expected an array of column strings.",
    });
  }
  if (
    options.defaultLimit !== undefined &&
    (!Number.isFinite(options.defaultLimit) || options.defaultLimit < 0)
  ) {
    issues.push({
      path: "defaultLimit",
      message: "Expected a non-negative finite number.",
    });
  }
  if (
    options.emptyMessage !== undefined &&
    typeof options.emptyMessage !== "string"
  ) {
    issues.push({ path: "emptyMessage", message: "Expected a string." });
  }
  if (
    options.excludeSelf !== undefined &&
    typeof options.excludeSelf !== "boolean"
  ) {
    issues.push({ path: "excludeSelf", message: "Expected a boolean." });
  }
  return issues;
}

function isFormat(value: QueryOptions["defaultFormat"]): boolean {
  return value === undefined || value === "table" || value === "list";
}

function isColumnList(value: QueryOptions["defaultColumns"]): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}
