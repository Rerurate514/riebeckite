import {
  type ConfigValidationIssue,
  type ContentManifest,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  buildFolderPages,
  collapseFolderEntryLocations,
} from "./src/folder_pages.js";
import { resolveFolderPagesOptions } from "./src/options.js";
import { renderFolderPage } from "./src/pages.js";
import type { FolderPagesModel, FolderPagesOptions } from "./src/types.js";

export {
  buildFolderPages,
  collapseFolderEntryLocations,
} from "./src/folder_pages.js";
export {
  DEFAULT_FOLDER_PAGES_CLASS_NAME,
  DEFAULT_FOLDER_PAGES_FOLDERS_LABEL,
  DEFAULT_FOLDER_PAGES_PAGES_LABEL,
  resolveFolderPagesOptions,
} from "./src/options.js";
export { renderFolderPage } from "./src/pages.js";
export type {
  FolderPage,
  FolderPageLink,
  FolderPagesModel,
  FolderPagesOptions,
  ResolvedFolderPagesOptions,
} from "./src/types.js";

export const FOLDER_PAGES_PLUGIN_NAME = "folder-pages";

export function folderPages(options: FolderPagesOptions = {}) {
  const resolved = resolveFolderPagesOptions(options);
  const models = new WeakMap<ContentManifest, FolderPagesModel>();
  const modelFor = (manifest: ContentManifest): FolderPagesModel => {
    const cached = models.get(manifest);
    if (cached) return cached;
    const model = buildFolderPages(manifest, resolved.exclude);
    models.set(manifest, model);
    return model;
  };

  return definePlugin({
    name: FOLDER_PAGES_PLUGIN_NAME,
    provides: ["content.folder-pages"],
    options,
    optional: ["content.localization"],
    assets: [
      createStyleAsset(
        FOLDER_PAGES_PLUGIN_NAME,
        "@riebeckite/plugin-folder-pages/style.css",
      ),
    ],
    validateOptions: validateFolderPagesOptions,
    extendContentLocations: ({ locations }) => {
      collapseFolderEntryLocations(locations);
    },
    manifestHookFastPathSafe: true,
    onManifestCreated: ({ manifest }) => {
      for (const page of modelFor(manifest).byPath.values()) {
        manifest.folderLocations.set(page.pathname, {
          pathname: page.pathname,
          folder: page.folder,
          ...(page.language === undefined ? {} : { language: page.language }),
        });
      }
      models.delete(manifest);
    },
    pageTypes: [
      {
        id: "folder-page",
        directoryIndex: true,
        paths: ({ manifest }) => modelFor(manifest).paths,
        outputDependencies: ({ manifest, pathname }) => {
          const dependencies =
            modelFor(manifest).byPath.get(pathname)?.dependencies;
          return dependencies
            ? [
                ...dependencies,
                { type: "projection" as const, projection: "navigation" },
                { type: "projection" as const, projection: "recent-posts" },
              ]
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname }) => {
          const page = modelFor(manifest).byPath.get(pathname);
          if (!page) return null;
          const rendered = renderFolderPage(page, resolved);
          return {
            type: "folder-page",
            layout: resolved.layout,
            pathname: page.pathname,
            title: rendered.title,
            body: rendered.html,
            language: page.language,
          };
        },
        resolveRoute: ({ manifest, pathname }) => {
          const page = modelFor(manifest).byPath.get(pathname);
          if (!page) return null;
          const rendered = renderFolderPage(page, resolved);
          return {
            type: "folder-page",
            layout: resolved.layout,
            pathname: page.pathname,
            title: rendered.title,
            body: rendered.html,
            language: page.language,
          };
        },
      },
    ],
  });
}

function validateFolderPagesOptions(
  options: FolderPagesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  if (
    options.layout !== undefined &&
    options.layout !== "article" &&
    options.layout !== "wide"
  ) {
    issues.push({ path: "layout", message: 'Expected "article" or "wide".' });
  }
  for (const key of ["className", "pagesLabel", "foldersLabel"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  for (const key of ["showDate", "showTags"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  if (!Array.isArray(options.exclude)) {
    if (options.exclude !== undefined) {
      issues.push({ path: "exclude", message: "Expected an array." });
    }
  } else {
    options.exclude.forEach((slug, index) => {
      if (typeof slug !== "string" || slug.trim() === "") {
        issues.push({
          path: `exclude[${index}]`,
          message: "Expected a non-empty string.",
        });
      }
    });
  }
  return issues;
}
