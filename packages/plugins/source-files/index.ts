import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  listSourceFiles,
  renderSourceEmbed,
  resolveSourcePage,
  resolveSourcePath,
  sourceFilePath,
} from "./src/source.js";

export type SourceFilesOptions = {
  include: readonly string[];
  exclude?: readonly string[];
  maxBytes?: number;
};

const PLUGIN_NAME = "source-files";

export function sourceFiles(options: SourceFilesOptions) {
  return definePlugin({
    name: PLUGIN_NAME,
    order: -30,
    processedContentCache: {
      version: "source-files-v1",
      dependencyMode: "tracked",
    },
    options,
    validateOptions,
    renderers: [
      {
        name: "source-file",
        render: (context) => renderSourceEmbed(context, options),
      },
    ],
    pageTypes: [
      {
        id: "source-file",
        directoryIndex: true,
        paths: (context) =>
          listSourceFiles(context.manifest, context.contentSource, options),
        outputDependencies: (context) => {
          const path = resolveSourcePath(
            context.pathname,
            context.manifest,
            options,
          );
          return path ? [{ type: "file", path }] : [];
        },
        resolve: (context) => resolveSourcePage(context, options),
        resolveRoute: (context) => resolveSourcePage(context, options),
      },
    ],
    assets: [
      createStyleAsset(
        PLUGIN_NAME,
        "@riebeckite/plugin-source-files/style.css",
      ),
    ],
    clientEntries: [
      createClientEntry(
        PLUGIN_NAME,
        "@riebeckite/plugin-source-files/client",
        "initSourceFiles",
      ),
    ],
  });
}

export { sourceFilePath };

function validateOptions(
  options: SourceFilesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (
    !options ||
    !Array.isArray(options.include) ||
    options.include.length === 0
  ) {
    return [
      { path: "include", message: "Expected at least one include pattern." },
    ];
  }
  const issues: ConfigValidationIssue[] = [];
  for (const [key, value] of Object.entries({
    include: options.include,
    exclude: options.exclude,
  })) {
    if (
      value !== undefined &&
      (!Array.isArray(value) ||
        value.some((item) => typeof item !== "string" || item.trim() === ""))
    ) {
      issues.push({
        path: key,
        message: "Expected an array of non-empty strings.",
      });
    }
  }
  if (
    options.maxBytes !== undefined &&
    (!Number.isInteger(options.maxBytes) || options.maxBytes < 1)
  ) {
    issues.push({ path: "maxBytes", message: "Expected a positive integer." });
  }
  return issues;
}
