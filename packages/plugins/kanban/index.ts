import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkKanban } from "./src/remark.js";
import { createKanbanRuntime } from "./src/runtime.js";
import { type KanbanOptions, resolveKanbanOptions } from "./src/types.js";

export type {
  KanbanCard,
  KanbanColumn,
  KanbanParseResult,
} from "./src/parse.js";
export { isKanbanNote, parseKanban, stripFrontmatter } from "./src/parse.js";
export {
  createKanbanPlaceholder,
  createKanbanPlaceholderPattern,
  decodeKanbanSource,
  encodeKanbanSource,
  KANBAN_ATTRIBUTE,
} from "./src/placeholder.js";
export type { RemarkKanbanOptions } from "./src/remark.js";
export { remarkKanban } from "./src/remark.js";
export type {
  KanbanLink,
  KanbanLinkResolver,
  KanbanSource,
} from "./src/render.js";
export { createKanbanLinkResolver, renderKanban } from "./src/render.js";
export type { KanbanOptions, ResolvedKanbanOptions } from "./src/types.js";
export { resolveKanbanOptions } from "./src/types.js";

export function kanban(options: KanbanOptions = {}) {
  const resolved = resolveKanbanOptions(options);
  const runtime = createKanbanRuntime(resolved);

  return definePlugin({
    name: "kanban",
    processedContentCache: {
      version: "kanban-v1",
      dependencyMode: "none",
    },
    outputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateKanbanOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkKanban, resolved);
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.markdown);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest);
    },
    assets: [createStyleAsset("kanban")],
  });
}

export const kanbanPlugin = kanban;

function validateKanbanOptions(
  options: KanbanOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  for (const key of ["className", "language", "columnMarker"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  for (const key of ["autoDetect", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}
