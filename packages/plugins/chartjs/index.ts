import type { ConfigValidationIssue } from "@riebeckite/core";
import { defineDiagramPlugin } from "@riebeckite/diagram";
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
  return defineDiagramPlugin({
    name: "chartjs",
    order: -10,
    processedContentCache: {
      version: "chartjs-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateChartJsOptions,
    rehype: rehypeChartJs,
    style: "@riebeckite/plugin-chartjs/style.css",
    client: {
      moduleSpecifier: "@riebeckite/plugin-chartjs/client",
      exportName: "initChartJs",
    },
  });
}

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
