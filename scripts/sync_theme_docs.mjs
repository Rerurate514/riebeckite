#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import * as shared from "./sync_docs.mjs";

export const GENERATED_MARKER_PREFIX = "<!-- Generated from docs/docs/themes/";
export const generatedMarker = (pageName) =>
  shared.generatedMarker("theme", pageName);
export const rewriteTarget = (rawTarget, options) =>
  shared.rewriteTarget(rawTarget, {
    ...options,
    collection: "theme",
    collections: shared.documentationCollections,
    repositoryDirectory: options.repositoryDirectory ?? shared.repositoryRoot,
  });
export const rewriteDocumentLinks = (text, options) =>
  shared.rewriteDocumentLinks(text, {
    ...options,
    collection: "theme",
    collections: shared.documentationCollections,
    repositoryDirectory: options.repositoryDirectory ?? shared.repositoryRoot,
  });
export const planSync = shared.planSync;
export function buildDesiredReadmes(options = {}) {
  return shared.buildDesiredReadmes({
    collection: "theme",
    packageRoot:
      options.themesRoot ?? shared.documentationCollections.theme.packageRoot,
    docsRoot:
      options.docsThemesRoot ?? shared.documentationCollections.theme.docsRoot,
    repositoryDirectory: options.repositoryRoot ?? shared.repositoryRoot,
  });
}
export const main = (argv = process.argv.slice(2)) =>
  shared.sync("theme", argv);

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  main();
