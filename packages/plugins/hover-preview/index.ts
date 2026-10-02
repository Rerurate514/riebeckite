import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  isPublishable,
} from "@riebeckite/core";
import { resolveHoverPreviewOptions } from "./src/options.js";
import { createHoverPreviewRuntime } from "./src/runtime.js";
import type { HoverPreviewOptions } from "./src/types.js";

export { initHoverPreview } from "./src/init.js";
export {
  DEFAULT_HOVER_PREVIEW_CLASS,
  DEFAULT_HOVER_PREVIEW_DELAY,
  DEFAULT_HOVER_PREVIEW_EXCERPT_LENGTH,
  DEFAULT_HOVER_PREVIEW_SELECTOR,
  resolveHoverPreviewOptions,
} from "./src/options.js";
export {
  buildPreviewIndex,
  createExcerpt,
  htmlToPlainText,
} from "./src/preview-index.js";
export {
  HOVER_PREVIEW_ATTRIBUTE,
  HOVER_PREVIEW_SCRIPT_ID,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./src/render.js";
export type {
  HoverPreviewEntry,
  HoverPreviewIndex,
  HoverPreviewOptions,
  ResolvedHoverPreviewOptions,
} from "./src/types.js";

export function hoverPreviewPlugin(options: HoverPreviewOptions = {}) {
  const resolved = resolveHoverPreviewOptions(options);
  const runtime = createHoverPreviewRuntime(resolved);

  return definePlugin({
    name: "hover-preview",
    processedContentCache: {
      version: "hover-preview-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateHoverPreviewOptions,
    onManifestCreated: (context) => {
      // Only published entries may appear in the hover preview payload: the
      // payload is embedded into page HTML, so indexing drafts or private notes
      // would leak their titles and excerpts into the public build output.
      const strategy =
        context.config?.content.filters.publishStrategy ?? "explicit";
      runtime.inject(context.manifest, (entry) =>
        isPublishable(strategy, entry.frontmatter),
      );
    },
    assets: [createStyleAsset("hover-preview")],
    clientEntries: [createClientEntry("hover-preview", "initHoverPreview")],
  });
}

export const hoverPreview = hoverPreviewPlugin;

function validateHoverPreviewOptions(
  options: HoverPreviewOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (
    options.delay !== undefined &&
    (!Number.isFinite(options.delay) || options.delay < 0)
  ) {
    issues.push({
      path: "delay",
      message: "Expected a non-negative finite number.",
    });
  }
  if (
    options.excerptLength !== undefined &&
    (!Number.isFinite(options.excerptLength) || options.excerptLength <= 0)
  ) {
    issues.push({
      path: "excerptLength",
      message: "Expected a positive finite number.",
    });
  }
  if (
    options.maxEntries !== undefined &&
    (!Number.isInteger(options.maxEntries) || options.maxEntries < 1)
  ) {
    issues.push({
      path: "maxEntries",
      message: "Expected a positive integer.",
    });
  }
  if (
    options.selector !== undefined &&
    (typeof options.selector !== "string" || options.selector.trim() === "")
  ) {
    issues.push({
      path: "selector",
      message: "Expected a non-empty string.",
    });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({
      path: "className",
      message: "Expected a non-empty string.",
    });
  }
  if (
    options.includeTitles !== undefined &&
    typeof options.includeTitles !== "boolean"
  ) {
    issues.push({
      path: "includeTitles",
      message: "Expected a boolean.",
    });
  }

  return issues;
}
