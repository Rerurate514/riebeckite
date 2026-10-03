import {
  type ConfigValidationIssue,
  type ContentManifest,
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
    const model = buildFolderPages(manifest);
    models.set(manifest, model);
    return model;
  };

  return definePlugin({
    name: FOLDER_PAGES_PLUGIN_NAME,
    provides: ["content.folder-pages"],
    options,
    optional: ["content.localization"],
    validateOptions: validateFolderPagesOptions,
    extendContentLocations: ({ locations }) => {
      collapseFolderEntryLocations(locations);
    },
    onManifestCreated: ({ manifest }) => {
      for (const page of modelFor(manifest).byPath.values()) {
        manifest.folderLocations.set(page.folder, { pathname: page.pathname });
      }
    },
    pageTypes: [
      {
        id: "folder-page",
        directoryIndex: true,
        paths: ({ manifest }) => modelFor(manifest).paths,
        outputDependencies: ({ manifest, pathname }) =>
          modelFor(manifest).byPath.get(pathname)?.dependencies ?? [
            { type: "unknown" },
          ],
        resolve: ({ manifest, pathname }) => {
          const page = modelFor(manifest).byPath.get(pathname);
          if (!page) return null;
          const rendered = renderFolderPage(page, resolved);
          return {
            type: "folder-page",
            pathname: page.pathname,
            title: rendered.title,
            body: rendered.html,
          };
        },
      },
    ],
  });
}

export const folderPagesPlugin = folderPages;

function validateFolderPagesOptions(
  options: FolderPagesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  for (const key of ["className", "pagesLabel", "foldersLabel"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  return issues;
}
