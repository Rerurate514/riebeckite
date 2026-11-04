import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkDataview } from "./src/remark.js";
import { createDataviewRuntime } from "./src/runtime.js";
import type { DataviewOptions } from "./src/types.js";

export {
  type DataviewEvaluateOptions,
  DataviewEvaluationError,
  type DataviewGroup,
  type DataviewNote,
  type DataviewRow,
  type DataviewScope,
  type DataviewSelection,
  evaluateDataviewExpression,
  formatGroupKey,
  isTruthy,
  loadDataviewNotes,
  matchesDataviewFrom,
  readDataviewField,
  selectDataviewEntries,
  toDataviewTime,
} from "./src/evaluate.js";
export {
  type InlineFields,
  normalizeFieldKey,
  parseInlineFields,
  parseInlineFieldText,
  parseInlineValue,
  stripInlineFieldMarkup,
} from "./src/inline_fields.js";
export {
  DataviewParseError,
  parseDataview,
  parseExpression,
} from "./src/parse.js";
export {
  createDataviewPlaceholder,
  createDataviewPlaceholderPattern,
  DATAVIEW_ATTRIBUTE,
} from "./src/placeholder.js";
export { type RemarkDataviewOptions, remarkDataview } from "./src/remark.js";
export { renderDataview, renderDataviewError } from "./src/render.js";
export {
  type DataviewTask,
  parseDataviewTasks,
} from "./src/tasks.js";
export {
  type DataviewArithmeticOperator,
  type DataviewColumn,
  type DataviewCommand,
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
  DEFAULT_DATAVIEW_CLASS_NAME,
  DEFAULT_DATAVIEW_LANGUAGE,
  type ResolvedDataviewOptions,
  resolveDataviewOptions,
} from "./src/types.js";

export function dataview(options: DataviewOptions = {}) {
  const language = options.language ?? "dataview";
  const runtime = createDataviewRuntime(options);

  return definePlugin({
    name: "dataview",
    processedContentCache: {
      version: "dataview-v2",
      dependencyMode: "none",
    },
    contentOutputDependencies: [{ type: "global" }],
    options,
    provides: ["content.dataview"],
    validateOptions: validateDataviewOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkDataview, { language });
    },
    onManifestCreated: async (context) => {
      await runtime.resolve(context.manifest, context.diagnostics, {
        contentSource: context.contentSource,
        buildTime: context.buildTime,
      });
    },
    assets: [
      createStyleAsset("dataview", "@riebeckite/plugin-dataview/style.css"),
    ],
  });
}

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
  if (
    options.localeMode !== undefined &&
    options.localeMode !== "current" &&
    options.localeMode !== "fallback" &&
    options.localeMode !== "all"
  ) {
    issues.push({
      path: "localeMode",
      message: 'Expected "current", "fallback", or "all".',
    });
  }
  return issues;
}
