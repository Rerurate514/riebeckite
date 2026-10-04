import {
  appendContentBodySlot,
  type ConfigValidationIssue,
  type ContentManifest,
  type ContentManifestEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "./src/navigation.js";
import { renderDocsPrevNext, renderDocsSidebar } from "./src/render.js";
import type { DocsOptions } from "./src/types.js";

export {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "./src/navigation.js";
export { renderDocsPrevNext, renderDocsSidebar } from "./src/render.js";
export type {
  DocsNavigationItem,
  DocsOptions,
  DocsSidebarFrontmatter,
  ResolvedDocsOptions,
} from "./src/types.js";

export const DOCS_PLUGIN_NAME = "docs";

export function docs(options: DocsOptions) {
  const resolved = resolveDocsOptions(options);

  return definePlugin({
    name: `${DOCS_PLUGIN_NAME}:${resolved.root}`,
    order: 300,
    outputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateDocsOptions,
    assets: [createStyleAsset(DOCS_PLUGIN_NAME)],
    onManifestCreated: ({ manifest }) => {
      const entries = getPublishedEntries(manifest);
      for (const entry of entries) {
        const localizedEntries = entries.filter((candidate) =>
          sameLanguage(entry, candidate),
        );
        const navigation = buildDocsNavigation(localizedEntries, resolved);
        const sequence = flattenDocsNavigation(navigation);
        if (!sequence.some((item) => item.slug === entry.slug)) continue;
        appendContentBodySlot(
          entry,
          "article.aside",
          renderDocsSidebar({
            items: navigation,
            currentPermalink: entry.permalink,
            label: resolved.sidebar.label,
          }),
        );
        if (!resolved.prevNext) continue;
        appendContentBodySlot(
          entry,
          "article.footer",
          renderDocsPrevNext(
            sequence,
            entry.permalink,
            entry.publicLocation.metadata?.["l10n.lang"],
          ),
        );
      }
    },
  });
}

export const docsPlugin = docs;

function getPublishedEntries(
  manifest: ContentManifest,
): readonly ContentManifestEntry[] {
  return manifest.discoverableEntries;
}

function sameLanguage(
  current: ContentManifestEntry,
  candidate: ContentManifestEntry,
): boolean {
  const currentLanguage = current.publicLocation.metadata?.["l10n.lang"];
  const candidateLanguage = candidate.publicLocation.metadata?.["l10n.lang"];
  return currentLanguage
    ? candidateLanguage === currentLanguage
    : candidateLanguage === undefined;
}

function validateDocsOptions(
  options: DocsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  if (!options || typeof options !== "object") {
    return [{ path: "docs", message: "Expected docs options." }];
  }
  if (typeof options.root !== "string" || options.root.trim() === "") {
    issues.push({ path: "root", message: "Expected a non-empty string." });
  }
  if (options.sidebar !== undefined && typeof options.sidebar !== "object") {
    issues.push({ path: "sidebar", message: "Expected an object." });
  }
  if (options.prevNext !== undefined && typeof options.prevNext !== "boolean") {
    issues.push({ path: "prevNext", message: "Expected a boolean." });
  }
  return issues;
}
