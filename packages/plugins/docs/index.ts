import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveDocsOptions } from "./src/navigation.js";
import type { DocsOptions } from "./src/types.js";

export type { DocsPrevNextProps } from "./components/docs-prev-next.js";
export { default as DocsPrevNext } from "./components/docs-prev-next.js";
export type { DocsSidebarProps } from "./components/docs-sidebar.js";
export { default as DocsSidebar } from "./components/docs-sidebar.js";
export { getDocsNavigation, getDocsPrevNext } from "./src/data.js";
export { initDocsSidebar } from "./src/docs-sidebar.client.js";
export {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "./src/navigation.js";
export { renderDocsPrevNext, renderDocsSidebar } from "./src/render.js";
export type {
  DocsNavigationItem,
  DocsOptions,
  DocsSidebarFrontmatter,
  ResolvedDocsOptions,
} from "./src/types.js";

export const DOCS_PLUGIN_NAME = "docs";

export function docs(options: DocsOptions) {
  const resolved = resolveDocsOptions(options);

  return definePlugin({
    name: `${DOCS_PLUGIN_NAME}:${resolved.root}`,
    order: 300,
    contentOutputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateDocsOptions,
    assets: [
      createStyleAsset(DOCS_PLUGIN_NAME, "@riebeckite/plugin-docs/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        DOCS_PLUGIN_NAME,
        "@riebeckite/plugin-docs/client",
        "initDocsSidebar",
      ),
    ],
  });
}

export const docsPlugin = docs;

function validateDocsOptions(
  options: DocsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  if (!options || typeof options !== "object") {
    return [{ path: "docs", message: "Expected docs options." }];
  }
  if (typeof options.root !== "string" || options.root.trim() === "") {
    issues.push({ path: "root", message: "Expected a non-empty string." });
  }
  if (options.sidebar !== undefined && typeof options.sidebar !== "object") {
    issues.push({ path: "sidebar", message: "Expected an object." });
  }
  if (options.prevNext !== undefined && typeof options.prevNext !== "boolean") {
    issues.push({ path: "prevNext", message: "Expected a boolean." });
  }
  return issues;
}
