import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import type { HastNode, PlantumlOptions } from "./src/types.js";

export type { PlantumlFormat, PlantumlOptions } from "./src/types.js";

/**
 * Turns fenced `plantuml` code blocks into `<figure class="rb-plantuml">`
 * elements whose `<img>` points at a PlantUML server URL. The URL is built at
 * build time (UTF-8 → raw DEFLATE → PlantUML base64); no network access is
 * required while building and no client bundle is shipped.
 */
export function plantuml(options: PlantumlOptions = {}) {
  return definePlugin({
    name: "plantuml",
    options,
    validateOptions: validatePlantumlOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypePlantumlLazy, options);
    },
    assets: [createStyleAsset("plantuml")],
  });
}

export const plantumlPlugin = plantuml;

function validatePlantumlOptions(
  options: PlantumlOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (options.server !== undefined && !isHttpServer(options.server)) {
    issues.push({
      path: "server",
      message: "Expected an absolute http(s) URL.",
    });
  }
  if (
    options.format !== undefined &&
    options.format !== "svg" &&
    options.format !== "png"
  ) {
    issues.push({ path: "format", message: 'Expected "svg" or "png".' });
  }
  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}

function isHttpServer(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\/.+/i.test(value.trim());
}

function rehypePlantumlLazy(options: PlantumlOptions = {}) {
  return async (tree: HastNode, file: unknown) => {
    const { rehypePlantuml } = await import("./src/rehype.js");
    const transformer = rehypePlantuml(options) as (
      tree: HastNode,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
