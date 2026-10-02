import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveSidenotesOptions } from "./src/options.js";
import { rehypeSidenotes } from "./src/rehype.js";
import type { SidenotesOptions } from "./src/types.js";

export type { SidenotesClientOptions } from "./src/client.js";
export { initSidenotes } from "./src/client.js";
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
 * Tufte-style side notes. Authors keep writing GFM footnotes (`[^1]` /
 * `[^1]: text`); a rehype plugin rewrites the generated footnote markup into
 * an inline reference plus a note that renders as a margin note on desktop
 * and as a tap-open popover on mobile.
 */
export function sidenotes(options: SidenotesOptions = {}) {
  const resolved = resolveSidenotesOptions(options);
  return definePlugin({
    name: SIDENOTES_PLUGIN_NAME,
    processedContentCache: {
      version: "sidenotes-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateSidenotesOptions,
    rehypePlugins: [() => rehypeSidenotes(resolved)],
    assets: [createStyleAsset(SIDENOTES_PLUGIN_NAME)],
    clientEntries: [
      createClientEntry(SIDENOTES_PLUGIN_NAME, "initSidenotes", {
        openLabel: resolved.openLabel,
        closeLabel: resolved.closeLabel,
      }),
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
  for (const key of [
    "className",
    "ariaLabel",
    "openLabel",
    "closeLabel",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  if (
    options.popoverAlignment !== undefined &&
    options.popoverAlignment !== "bottom" &&
    options.popoverAlignment !== "end"
  ) {
    issues.push({
      path: "popoverAlignment",
      message: 'Expected "bottom" or "end".',
    });
  }
  return issues;
}
