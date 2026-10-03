import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { buildBreadcrumbItems } from "./src/breadcrumbs.js";
import { resolveBreadcrumbsOptions } from "./src/options.js";
import {
  BREADCRUMBS_ATTRIBUTE,
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
  injectBreadcrumbNav,
  renderBreadcrumbNav,
} from "./src/render.js";
import type { BreadcrumbsOptions } from "./src/types.js";

export { buildBreadcrumbItems } from "./src/breadcrumbs.js";
export { resolveBreadcrumbsOptions } from "./src/options.js";
export {
  BREADCRUMBS_ATTRIBUTE,
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
  injectBreadcrumbNav,
  renderBreadcrumbNav,
} from "./src/render.js";
export type {
  BreadcrumbItem,
  BreadcrumbsOptions,
  ResolvedBreadcrumbsOptions,
} from "./src/types.js";

export const BREADCRUMBS_PLUGIN_NAME = "breadcrumbs";

/**
 * Slug-hierarchy breadcrumbs for Riebeckite notes.
 *
 * For every published entry it derives a trail from the note's slug and
 * inserts a `<nav>` at the top of the manifest entry HTML, which is the final
 * rendering source. The hierarchical BreadcrumbList JSON-LD is contributed
 * through `entry.headTags` so the Site shell can render it in the document
 * `<head>`. No client runtime is required.
 */
export function breadcrumbs(options: BreadcrumbsOptions = {}) {
  const resolved = resolveBreadcrumbsOptions(options);

  return definePlugin({
    name: BREADCRUMBS_PLUGIN_NAME,
    processedContentCache: {
      version: "breadcrumbs-v1",
      dependencyMode: "none",
    },
    outputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateBreadcrumbsOptions,
    onManifestCreated: (context) => {
      const { config, manifest } = context;
      if (!config) return;
      for (const entry of manifest.entries) {
        if (entry.html.includes(BREADCRUMBS_ATTRIBUTE)) continue;

        const items = buildBreadcrumbItems({
          manifest,
          entry,
          config,
          homeLabel: resolved.homeLabel,
        });
        if (items.length === 0) continue;

        let html = entry.html;
        const nav = renderBreadcrumbNav(items, resolved);
        html = injectBreadcrumbNav(html, nav);
        if (resolved.jsonLd) {
          const schema = buildBreadcrumbJsonLd(config, items);
          if (!hasBreadcrumbHeadTag(entry.headTags)) {
            entry.headTags = [
              ...(entry.headTags ?? []),
              buildBreadcrumbHeadTag(schema),
            ];
          }
        }
        entry.html = html;
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
  if (options.jsonLd !== undefined && typeof options.jsonLd !== "boolean") {
    issues.push({ path: "jsonLd", message: "Expected a boolean." });
  }
  return issues;
}
