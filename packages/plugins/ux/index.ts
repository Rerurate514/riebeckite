import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type PostContent,
} from "@riebeckite/core";
import { injectUxConfig } from "./src/inject.js";
import { resolveUxConfig, type UxOptions } from "./src/options.js";

export type { UxOptions, UxResolvedConfig } from "./src/options.js";

/**
 * Client-only progressive enhancements: a reading progress bar, a
 * back-to-top button, table-of-contents scroll-spy, and code copy buttons.
 *
 * None of the features change the rendered article markup, so the plugin
 * only injects a JSON config element and registers a browser initializer.
 */
export function uxPlugin(options: UxOptions = {}) {
  const config = resolveUxConfig(options);
  const tracked = new Map<string, PostContent>();

  return definePlugin({
    name: "ux",
    processedContentCache: {
      version: "ux-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateUxOptions,
    assets: [createStyleAsset("ux")],
    clientEntries: [createClientEntry("ux", "initUx")],
    onPostProcessed: (context) => {
      context.content.html = injectUxConfig(context.content.html, config);
      tracked.set(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      for (const entry of context.manifest.publicEntries) {
        const html = injectUxConfig(entry.html, config);
        if (html === entry.html) continue;

        entry.html = html;
        const content = tracked.get(entry.slug);
        if (content) content.html = html;
      }
    },
  });
}

/** Alias kept for naming symmetry with the other plugin factories. */
export const ux = uxPlugin;

function validateUxOptions(
  options: UxOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  for (const key of [
    "progress",
    "backToTop",
    "tocScrollSpy",
    "codeCopy",
  ] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  for (const key of ["backToTopLabel", "copyLabel", "copiedLabel"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  return issues;
}
