import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkDataview } from "./src/remark.js";
import { createDataviewRuntime } from "./src/runtime.js";
import type { DataviewOptions } from "./src/types.js";

export { parseDataview, DataviewParseError } from "./src/parse.js";
export {
  selectDataviewEntries,
  evaluateDataviewExpression,
  matchesDataviewFrom,
  readDataviewField,
  toDataviewTime,
  isTruthy,
  DataviewEvaluationError,
  type DataviewGroup,
  type DataviewScope,
  type DataviewSelection,
} from "./src/evaluate.js";
export { renderDataview, renderDataviewError } from "./src/render.js";
export { remarkDataview, type RemarkDataviewOptions } from "./src/remark.js";
export {
  DATAVIEW_ATTRIBUTE,
  createDataviewPlaceholder,
  createDataviewPlaceholderPattern,
} from "./src/placeholder.js";
export {
  DEFAULT_DATAVIEW_CLASS_NAME,
  DEFAULT_DATAVIEW_LANGUAGE,
  resolveDataviewOptions,
  type DataviewColumn,
  type DataviewComparisonOperator,
  type DataviewExpression,
  type DataviewFrom,
  type DataviewOptions,
  type DataviewParseResult,
  type DataviewQueryType,
  type DataviewSort,
  type DataviewSortOrder,
  type DataviewSource,
  type DataviewSpec,
  type ResolvedDataviewOptions,
} from "./src/types.js";

export function dataviewPlugin(options: DataviewOptions = {}) {
  const language = options.language ?? "dataview";
  const runtime = createDataviewRuntime(options);

  return definePlugin({
    name: "dataview",
    options,
    provides: ["content.dataview"],
    validateOptions: validateDataviewOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkDataview, { language });
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics);
    },
    assets: [createStyleAsset("dataview")],
  });
}

export const dataview = dataviewPlugin;

function validateDataviewOptions(
  options: DataviewOptions | undefined,
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
  if (
    options.hideFallback !== undefined &&
    typeof options.hideFallback !== "boolean"
  ) {
    issues.push({ path: "hideFallback", message: "Expected a boolean." });
  }
  if (
    options.limit !== undefined &&
    (!Number.isFinite(options.limit) || options.limit < 0)
  ) {
    issues.push({
      path: "limit",
      message: "Expected a non-negative finite number.",
    });
  }
  return issues;
}
