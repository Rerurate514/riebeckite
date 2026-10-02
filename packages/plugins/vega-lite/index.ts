import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeVegaLite } from "./src/rehype.js";
import type { VegaLiteOptions } from "./src/types.js";

export { rehypeVegaLite } from "./src/rehype.js";
export type {
  VegaLiteOptions,
  VegaLiteRenderer,
  VegaLiteSpec,
  VegaLiteTheme,
} from "./src/types.js";

const THEMES = ["light", "dark", "none"] as const;
const RENDERERS = ["canvas", "svg"] as const;

/**
 * Renders fenced `vega-lite` (and `vega`) code blocks as charts. The block body
 * is a Vega-Lite JSON specification; the chart is drawn in the browser by
 * `initVegaLite`, which imports the Vega runtime dynamically.
 */
export function vegaLite(options: VegaLiteOptions = {}) {
  return definePlugin({
    name: "vega-lite",
    order: -10,
    processedContentCache: {
      version: "vega-lite-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateVegaLiteOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeVegaLite, options);
    },
    assets: [createStyleAsset("vega-lite")],
    clientEntries: [createClientEntry("vega-lite", "initVegaLite")],
  });
}

/** Alias kept for symmetry with the other plugin factories. */
export const vegaLitePlugin = vegaLite;

function validateVegaLiteOptions(
  options: VegaLiteOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (options.caption !== undefined && typeof options.caption !== "boolean") {
    issues.push({ path: "caption", message: "Expected a boolean." });
  }
  if (
    options.actions !== undefined &&
    options.actions !== null &&
    typeof options.actions !== "boolean"
  ) {
    issues.push({ path: "actions", message: "Expected a boolean or null." });
  }
  if (options.theme !== undefined && !isTheme(options.theme)) {
    issues.push({
      path: "theme",
      message: 'Expected "light", "dark", or "none".',
    });
  }
  if (options.renderer !== undefined && !isRenderer(options.renderer)) {
    issues.push({
      path: "renderer",
      message: 'Expected "canvas" or "svg".',
    });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  return issues;
}

function isTheme(value: unknown): boolean {
  return THEMES.includes(value as (typeof THEMES)[number]);
}

function isRenderer(value: unknown): boolean {
  return RENDERERS.includes(value as (typeof RENDERERS)[number]);
}
