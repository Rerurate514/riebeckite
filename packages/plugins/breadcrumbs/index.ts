import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { buildBreadcrumbItems } from "./src/breadcrumbs.js";
import { resolveBreadcrumbsOptions } from "./src/options.js";
import {
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
} from "./src/render.js";
import type { BreadcrumbsOptions } from "./src/types.js";

export type { BreadcrumbsProps } from "./components/breadcrumbs.js";
export { default as Breadcrumbs } from "./components/breadcrumbs.js";
export {
  buildBreadcrumbItems,
  getBreadcrumbs,
} from "./src/breadcrumbs.js";
export { resolveBreadcrumbsOptions } from "./src/options.js";
export {
  BREADCRUMBS_ATTRIBUTE,
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
  renderBreadcrumbNav,
} from "./src/render.js";
export type {
  BreadcrumbItem,
  BreadcrumbsOptions,
  ResolvedBreadcrumbsOptions,
} from "./src/types.js";

export const BREADCRUMBS_PLUGIN_NAME = "breadcrumbs";

/**
 * Public-location breadcrumbs for Riebeckite notes.
 *
 * For every published entry it derives a trail from the note's canonical public location and
 * contributes a `<nav>` to the article header. The hierarchical BreadcrumbList
 * JSON-LD is contributed
 * through `entry.headTags` so the Site shell can render it in the document
 * `<head>`. No client runtime is required.
 */
export function breadcrumbs(options: BreadcrumbsOptions = {}) {
  const resolved = resolveBreadcrumbsOptions(options);

  return definePlugin({
    name: BREADCRUMBS_PLUGIN_NAME,
    optional: ["content.folder-pages"],
    processedContentCache: {
      version: "breadcrumbs-v1",
      dependencyMode: "none",
    },
    contentOutputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateBreadcrumbsOptions,
    onManifestCreated: (context) => {
      const { config, manifest } = context;
      if (!config) return;
      for (const entry of manifest.publicEntries) {
        const items = buildBreadcrumbItems({
          manifest,
          entry,
          config,
          homeLabel: resolved.homeLabel,
        });
        if (items.length === 0) continue;

        if (resolved.jsonLd) {
          const schema = buildBreadcrumbJsonLd(config, items);
          if (!hasBreadcrumbHeadTag(entry.headTags)) {
            entry.headTags = [
              ...(entry.headTags ?? []),
              buildBreadcrumbHeadTag(schema),
            ];
          }
        }
      }
    },
    assets: [createStyleAsset(BREADCRUMBS_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const breadcrumbsPlugin = breadcrumbs;

function validateBreadcrumbsOptions(
  options: BreadcrumbsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  const assertNonEmptyString = (key: keyof BreadcrumbsOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  };
  assertNonEmptyString("homeLabel");
  assertNonEmptyString("className");
  assertNonEmptyString("ariaLabel");
  assertNonEmptyString("separator");
  for (const key of ["jsonLd"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}
