import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeWavedrom } from "./src/rehype.js";
import type { WavedromOptions, WavedromSkin } from "./src/types.js";

export { rehypeWavedrom } from "./src/rehype.js";
export type { WavedromOptions, WavedromSkin } from "./src/types.js";

const SKINS: readonly WavedromSkin[] = ["default", "narrow", "lowkey"];

/**
 * Renders fenced `wavedrom` (and `wavejson`) code blocks as WaveDrom timing
 * diagrams. The block body is a strict JSON WaveJSON object; the diagram is
 * drawn in the browser by `initWaveDrom`.
 */
export function wavedrom(options: WavedromOptions = {}) {
  return definePlugin({
    name: "wavedrom",
    order: -10,
    options,
    validateOptions: validateWavedromOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeWavedrom, options);
    },
    assets: [createStyleAsset("wavedrom")],
    clientEntries: [createClientEntry("wavedrom", "initWaveDrom")],
  });
}

/** Alias kept for symmetry with the other plugin factories. */
export const wavedromPlugin = wavedrom;

function validateWavedromOptions(
  options: WavedromOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (options.skin !== undefined && !SKINS.includes(options.skin)) {
    issues.push({
      path: "skin",
      message: 'Expected "default", "narrow", or "lowkey".',
    });
  }
  if (options.caption !== undefined && typeof options.caption !== "boolean") {
    issues.push({ path: "caption", message: "Expected a boolean." });
  }
  if (options.fallback !== undefined && typeof options.fallback !== "boolean") {
    issues.push({ path: "fallback", message: "Expected a boolean." });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  return issues;
}
