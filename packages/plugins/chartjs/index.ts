import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeChartJs } from "./src/rehype.js";
import type { ChartJsOptions } from "./src/types.js";

export { rehypeChartJs } from "./src/rehype.js";
export type {
  ChartJsConfig,
  ChartJsOptions,
  ChartJsType,
} from "./src/types.js";

/**
 * Renders fenced `chart` code blocks as responsive Chart.js canvases. The
 * block body is a Chart.js configuration (or a small shorthand); charts are
 * drawn in the browser by `initChartJs`.
 */
export function chartjs(options: ChartJsOptions = {}) {
  return definePlugin({
    name: "chartjs",
    order: -10,
    options,
    validateOptions: validateChartJsOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeChartJs, options);
    },
    assets: [createStyleAsset("chartjs")],
    clientEntries: [createClientEntry("chartjs", "initChartJs")],
  });
}

/** Alias kept for symmetry with the other plugin factories. */
export const chartjsPlugin = chartjs;

function validateChartJsOptions(
  options: ChartJsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.responsive !== undefined &&
    typeof options.responsive !== "boolean"
  ) {
    issues.push({ path: "responsive", message: "Expected a boolean." });
  }
  if (options.caption !== undefined && typeof options.caption !== "boolean") {
    issues.push({ path: "caption", message: "Expected a boolean." });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  return issues;
}
