import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";
import type { D2Options, HastNode } from "./src/types.js";

export type {
  D2ClientOptions,
  D2Layout,
  D2ModuleApi,
  D2Options,
  D2RenderMode,
  D2Theme,
} from "./src/types.js";

const LAYOUTS = ["dagre", "elk"] as const;

export function d2(options: D2Options = {}) {
  return definePlugin({
    name: "d2",
    order: -10,
    options,
    validateOptions: validateD2Options,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeD2Lazy, options);
    },
    assets: [createStyleAsset("d2")],
    clientEntries: [createClientEntry("d2", "initD2Diagrams")],
  });
}

/** Alias matching the `*Plugin` convention used by several packages. */
export const d2Plugin = d2;

function validateD2Options(
  options: D2Options | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.render !== undefined &&
    options.render !== "build" &&
    options.render !== "client" &&
    options.render !== "both"
  ) {
    issues.push({
      path: "render",
      message: 'Expected "build", "client", or "both".',
    });
  }
  if (options.layout !== undefined && !LAYOUTS.includes(options.layout)) {
    issues.push({ path: "layout", message: 'Expected "dagre" or "elk".' });
  }
  if (!isD2Theme(options.theme)) {
    issues.push({
      path: "theme",
      message:
        "Expected a theme number or an object with light and dark numbers.",
    });
  }
  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  return issues;
}

function isD2Theme(value: unknown): boolean {
  return (
    value === undefined ||
    typeof value === "number" ||
    (typeof value === "object" &&
      value !== null &&
      "light" in value &&
      "dark" in value &&
      typeof value.light === "number" &&
      typeof value.dark === "number")
  );
}

function rehypeD2Lazy(options: D2Options = {}) {
  return async (tree: HastNode, file: unknown) => {
    const { rehypeD2 } = await import("./src/rehype.js");
    const transformer = rehypeD2(options) as (
      tree: HastNode,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
