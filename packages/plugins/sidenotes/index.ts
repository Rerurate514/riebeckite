import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveSidenotesOptions } from "./src/options.js";
import { rehypeSidenotes } from "./src/rehype.js";
import type { SidenotesOptions } from "./src/types.js";

export { resolveSidenotesOptions } from "./src/options.js";
export { rehypeSidenotes } from "./src/rehype.js";
export {
  renderHastChildren,
  renderSidenotesNote,
  renderSidenotesReference,
  sidenotesKey,
  sidenotesNoteId,
} from "./src/render.js";
export type {
  ResolvedSidenotesOptions,
  SidenotesOptions,
} from "./src/types.js";

export const SIDENOTES_PLUGIN_NAME = "sidenotes";

/**
 * Styles GFM footnotes for Riebeckite. By default the definitions stay in the
 * trailing footnote list at the end of the article. With
 * `placement: "margin"`, a rehype plugin rewrites the generated footnote
 * markup into an inline reference plus a margin note.
 */
export function sidenotes(options: SidenotesOptions = {}) {
  const resolved = resolveSidenotesOptions(options);
  return definePlugin({
    name: SIDENOTES_PLUGIN_NAME,
    processedContentCache: {
      version: "sidenotes-v2",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateSidenotesOptions,
    rehypePlugins: [() => rehypeSidenotes(resolved)],
    assets: [
      createStyleAsset(
        SIDENOTES_PLUGIN_NAME,
        "@riebeckite/plugin-sidenotes/style.css",
      ),
    ],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const sidenotesPlugin = sidenotes;

function validateSidenotesOptions(
  options: SidenotesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  for (const key of ["className", "ariaLabel", "openLabel"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  if (
    options.placement !== undefined &&
    options.placement !== "end" &&
    options.placement !== "margin"
  ) {
    issues.push({
      path: "placement",
      message: 'Expected "end" or "margin".',
    });
  }
  return issues;
}
