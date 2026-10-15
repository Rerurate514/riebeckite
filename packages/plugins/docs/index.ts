import {
  appendContentBodySlot,
  type ConfigValidationIssue,
  type ContentManifest,
  type ContentManifestEntry,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  getEntryLanguage,
  type PluginDataHelper,
  type PublicContentView,
  selectEntriesByLanguage,
} from "@riebeckite/core";
import {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "./src/navigation.js";
import { renderDocsPrevNext, renderDocsSidebar } from "./src/render.js";
import type {
  DocsNavigationItem,
  DocsNavigationLink,
  DocsOptions,
} from "./src/types.js";

export type { DocsPrevNextProps } from "./components/docs-prev-next.js";
export { default as DocsPrevNext } from "./components/docs-prev-next.js";
export type { DocsSidebarProps } from "./components/docs-sidebar.js";
export { default as DocsSidebar } from "./components/docs-sidebar.js";

export { initDocsSidebar } from "./src/docs-sidebar.client.js";
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

export const getDocsNavigation: PluginDataHelper<
  { view: PublicContentView; entrySlug: string; options: DocsOptions },
  readonly DocsNavigationItem[]
> = ({ view, entrySlug, options }) => {
  const entry = view.findRoutableBySlug(entrySlug);
  if (!entry) return [];
  const localized = view.discoverableEntries.filter(
    (candidate) =>
      candidate.publicLocation.language === entry.publicLocation.language,
  );
  return buildDocsNavigation(localized, resolveDocsOptions(options));
};

export const getDocsPrevNext: PluginDataHelper<
  { items: readonly DocsNavigationItem[]; slug: string },
  { readonly previous?: DocsNavigationLink; readonly next?: DocsNavigationLink }
> = ({ items, slug }) => {
  const sequence = flattenDocsNavigation(items);
  const index = sequence.findIndex((item) => item.slug === slug);
  if (index < 0) return {};
  return {
    ...(sequence[index - 1] ? { previous: sequence[index - 1] } : {}),
    ...(sequence[index + 1] ? { next: sequence[index + 1] } : {}),
  };
};

export const DOCS_PLUGIN_NAME = "docs";

export function docs(options: DocsOptions) {
  const resolved = resolveDocsOptions(options);

  return definePlugin({
    name: `${DOCS_PLUGIN_NAME}:${resolved.root}`,
    order: 300,
    contentOutputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateDocsOptions,
    assets: [createStyleAsset(DOCS_PLUGIN_NAME)],
    clientEntries: [createClientEntry(DOCS_PLUGIN_NAME, "initDocsSidebar")],
    onManifestCreated: ({ manifest }) => {
      const entries = getPublishedEntries(manifest);
      for (const entry of entries) {
        const localizedEntries = selectEntriesByLanguage(
          entries,
          getEntryLanguage(entry),
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
            getEntryLanguage(entry),
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
