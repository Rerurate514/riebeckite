#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import * as shared from "./sync_docs.mjs";

export const GENERATED_MARKER_PREFIX = "<!-- Generated from docs/docs/plugins/";
export const LEGACY_MARKER_PREFIX = "<!-- Generated from packages/plugins/";
export const generatedMarker = (pageName) =>
  shared.generatedMarker("plugin", pageName);
export const rewriteTarget = (rawTarget, options) =>
  shared.rewriteTarget(rawTarget, {
    ...options,
    collection: "plugin",
    collections: {
      ...shared.documentationCollections,
      plugin: {
        ...shared.documentationCollections.plugin,
        docsRoot:
          options.docsPluginsDirectory ??
          shared.documentationCollections.plugin.docsRoot,
      },
    },
    documentDirectory: options.documentDirectory,
    repositoryDirectory: options.repositoryDirectory ?? shared.repositoryRoot,
  });
export const rewriteDocumentLinks = (text, options) =>
  shared.rewriteDocumentLinks(text, {
    ...options,
    collection: "plugin",
    collections: {
      ...shared.documentationCollections,
      plugin: {
        ...shared.documentationCollections.plugin,
        docsRoot:
          options.docsPluginsDirectory ??
          shared.documentationCollections.plugin.docsRoot,
      },
    },
    documentDirectory: options.documentDirectory,
    repositoryDirectory: options.repositoryDirectory ?? shared.repositoryRoot,
  });
export const topLevelHeadings = shared.topLevelHeadings;
export const renderReadme = (manifestName, documentText, options) =>
  shared.renderReadme(manifestName, documentText, {
    ...options,
    collection: "plugin",
    collections: shared.documentationCollections,
  });
export const collectManifestSlugs = (root) =>
  shared.collectManifestSlugs(
    root ?? shared.documentationCollections.plugin.packageRoot,
  );
export function buildDesiredReadmes(options = {}) {
  return shared.buildDesiredReadmes({
    collection: "plugin",
    packageRoot:
      options.pluginsRoot ?? shared.documentationCollections.plugin.packageRoot,
    docsRoot:
      options.docsPluginsRoot ??
      shared.documentationCollections.plugin.docsRoot,
    repositoryDirectory: options.repositoryRoot ?? shared.repositoryRoot,
  });
}
export const planSync = shared.planSync;
export const main = (argv = process.argv.slice(2)) =>
  shared.sync("plugin", argv);

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  main();
