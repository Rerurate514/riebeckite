import {
  type ConfigValidationIssue,
  createClientEntry,
  definePlugin,
  localizedPagePaths,
} from "@riebeckite/core";
import type { GardenExplorerPluginOptions } from "./src/garden-explorer.js";
import { getGardenExplorerData } from "./src/garden-explorer.server.js";
import { renderGardenExplorerPage } from "./src/garden-explorer-page.js";

export { default as GardenExplorer } from "./components/garden-explorer.js";
export type {
  GardenExplorerData,
  GardenExplorerEdge,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerOptions,
  GardenExplorerPluginOptions,
  GardenExplorerTag,
} from "./src/garden-explorer.js";
export { getGardenExplorerData } from "./src/garden-explorer.server.js";

export function gardenExplorer(options: GardenExplorerPluginOptions = {}) {
  return definePlugin({
    name: "garden-explorer",
    options,
    validateOptions: validateGardenExplorerOptions,
    assets: [
      {
        pluginName: "garden-explorer",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-garden-explorer/style.css",
      },
    ],
    clientEntries: [
      createClientEntry(
        "garden-explorer",
        "@riebeckite/plugin-garden-explorer/client",
        undefined,
        undefined,
        undefined,
        undefined,
        "[data-riebeckite-garden-explorer]",
      ),
    ],
    pageTypes: [
      {
        id: "garden-explorer",
        paths: ({ manifest }) => localizedPagePaths(manifest, "/explore"),
        outputDependencies: [{ type: "global" }],
        resolve: ({ pathname, manifest, config, locale }) => {
          if (
            !localizedPagePaths(manifest, "/explore").includes(pathname) ||
            !config
          )
            return null;
          const siteTitle = config.site.title;
          return {
            type: "garden-explorer",
            layout: "wide",
            pathname,
            title: "Garden Explorer",
            description:
              "Explore notes through links, backlinks, tags, and folders.",
            ...(locale ? { language: locale } : {}),
            body: renderGardenExplorerPage(
              getGardenExplorerData({
                manifest,
                config,
                locale,
                resolveTitle: (slug, title) =>
                  typeof title === "string" && title.trim() ? title : slug,
                options,
              }),
              siteTitle,
            ),
          };
        },
        resolveRoute: ({ pathname, manifest, config, locale }) => {
          if (
            !localizedPagePaths(manifest, "/explore").includes(pathname) ||
            !config
          )
            return null;
          const siteTitle = config.site.title;
          return {
            type: "garden-explorer",
            layout: "wide",
            pathname,
            title: "Garden Explorer",
            description:
              "Explore notes through links, backlinks, tags, and folders.",
            ...(locale ? { language: locale } : {}),
            body: renderGardenExplorerPage(
              getGardenExplorerData({
                manifest,
                config,
                locale,
                resolveTitle: (slug, title) =>
                  typeof title === "string" && title.trim() ? title : slug,
                options,
              }),
              siteTitle,
            ),
          };
        },
      },
    ],
  });
}

function validateGardenExplorerOptions(
  options: GardenExplorerPluginOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options || options.exclude === undefined) return [];
  if (!Array.isArray(options.exclude)) {
    return [{ path: "exclude", message: "Expected an array." }];
  }
  return options.exclude.flatMap((slug, index) =>
    typeof slug === "string" && slug.trim() !== ""
      ? []
      : [
          {
            path: `exclude[${index}]`,
            message: "Expected a non-empty string.",
          },
        ],
  );
}
