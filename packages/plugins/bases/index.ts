import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { listBaseDocuments, resolveBaseDocument } from "./src/page.js";
import { remarkBases } from "./src/remark.js";
import { createBasesRuntime } from "./src/runtime.js";
import type { BasesOptions } from "./src/types.js";

export { analyzeBasesDependencies } from "./src/dependencies.js";
export {
  BasesEvaluationError,
  evaluateBasesExpression,
  matchesCondition,
  resolveValueRef,
} from "./src/evaluate.js";
export { parseBasesExpression } from "./src/expression.js";
export { parseBases } from "./src/parse.js";
export { remarkBases } from "./src/remark.js";
export {
  groupBasesEntries,
  resolveBasesProperty,
  sortBasesEntries,
  summarizeBasesValues,
} from "./src/transform.js";
export type {
  BasesBuiltinValue,
  BasesCondition,
  BasesExpression,
  BasesGroupBy,
  BasesGroupKey,
  BasesLiteral,
  BasesOperator,
  BasesOptions,
  BasesSort,
  BasesSpec,
  BasesValueRef,
  BasesView,
  BasesViewType,
} from "./src/types.js";

/**
 * Renders Obsidian Bases definitions from fenced `base` code blocks.
 *
 * A block body is an Obsidian Base YAML document. It is compiled to a filter /
 * sort / view spec at parse time and rendered against the content manifest at
 * build time, so no client-side JavaScript is required.
 */
export function bases(options: BasesOptions = {}) {
  const language = options.language ?? "base";
  const runtime = createBasesRuntime(options);

  return definePlugin({
    name: "bases",
    contentFileMetadata: true,
    resolveContentOutputDependencies: (entry) =>
      runtime.dependenciesFor(entry.slug),
    processedContentCache: {
      version: "bases-v3",
      dependencyMode: "none",
    },
    options,
    provides: ["content.bases"],
    validateOptions: validateBasesOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkBases, { language });
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics, context.config);
    },
    pageTypes: [
      {
        id: "bases-document",
        paths: async ({ manifest, contentSource, diagnostics }) => {
          const documents = await listBaseDocuments({
            manifest,
            contentSource,
            diagnostics,
          });
          runtime.setDocumentDependencies(
            new Map(
              documents.map((document) => [
                document.pathname,
                document.dependencies,
              ]),
            ),
          );
          return documents.map((document) => document.pathname);
        },
        outputDependencies: ({ pathname }) =>
          runtime.dependenciesForPage(pathname),
        resolve: (context) => resolveBaseDocument(context, options),
      },
    ],
    assets: [createStyleAsset("bases", "@riebeckite/plugin-bases/style.css")],
  });
}

/** Alias kept for symmetry with other plugin factories. */
export const basesPlugin = bases;

function validateBasesOptions(
  options: BasesOptions | undefined,
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
    options.limit !== undefined &&
    (!Number.isFinite(options.limit) || options.limit < 0)
  ) {
    issues.push({
      path: "limit",
      message: "Expected a non-negative finite number.",
    });
  }
  if (
    options.showFallback !== undefined &&
    typeof options.showFallback !== "boolean"
  ) {
    issues.push({ path: "showFallback", message: "Expected a boolean." });
  }
  if (
    options.view !== undefined &&
    (typeof options.view !== "string" || options.view.trim() === "")
  ) {
    issues.push({ path: "view", message: "Expected a non-empty string." });
  }
  return issues;
}
