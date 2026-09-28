import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkKanban } from "./src/remark.js";
import { createKanbanRuntime } from "./src/runtime.js";
import { resolveKanbanOptions, type KanbanOptions } from "./src/types.js";

export { isKanbanNote, parseKanban, stripFrontmatter } from "./src/parse.js";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanParseResult,
} from "./src/parse.js";
export {
  KANBAN_ATTRIBUTE,
  createKanbanPlaceholder,
  createKanbanPlaceholderPattern,
  decodeKanbanSource,
  encodeKanbanSource,
} from "./src/placeholder.js";
export { createKanbanLinkResolver, renderKanban } from "./src/render.js";
export type {
  KanbanLink,
  KanbanLinkResolver,
  KanbanSource,
} from "./src/render.js";
export { remarkKanban } from "./src/remark.js";
export type { RemarkKanbanOptions } from "./src/remark.js";
export { resolveKanbanOptions } from "./src/types.js";
export type { KanbanOptions, ResolvedKanbanOptions } from "./src/types.js";

export function kanban(options: KanbanOptions = {}) {
  const resolved = resolveKanbanOptions(options);
  const runtime = createKanbanRuntime(resolved);

  return definePlugin({
    name: "kanban",
    options,
    validateOptions: validateKanbanOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkKanban, resolved);
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.markdown, context.content);
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
    if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
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
