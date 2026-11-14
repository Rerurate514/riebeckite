import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

export async function checkProductionAssetIntegrity({ siteRoot }) {
  const absoluteSiteRoot = path.resolve(siteRoot);
  const assetsDirectory = await resolveAssetsDirectory(absoluteSiteRoot);
  const htmlFiles = await collectFiles(assetsDirectory, ".html");
  if (htmlFiles.length === 0) {
    throw new Error(`No SSG HTML files exist in ${assetsDirectory}.`);
  }

  const results = await Promise.all(
    htmlFiles.map((htmlFile) => checkHtmlAssets({ assetsDirectory, htmlFile })),
  );
  const manifest = await checkClientManifest(assetsDirectory);
  const errors = [
    ...results.flatMap((result) => result.errors),
    ...manifest.errors,
  ];
  const result = {
    assetsDirectory,
    htmlFileCount: htmlFiles.length,
    stylesheetReferenceCount: results.reduce(
      (count, page) => count + page.stylesheets,
      0,
    ),
    scriptReferenceCount: results.reduce(
      (count, page) => count + page.scripts,
      0,
    ),
    pagesWithStylesheets: results.filter((page) => page.stylesheets > 0).length,
    pagesWithoutStylesheets: results
      .filter((page) => page.stylesheets === 0 && !page.isRedirect)
      .map((page) => page.documentName),
    pagesWithScripts: results.filter((page) => page.scripts > 0).length,
    pagesWithoutScripts: results
      .filter((page) => page.scripts === 0 && !page.isRedirect)
      .map((page) => page.documentName),
    redirectDocumentCount: results.filter((page) => page.isRedirect).length,
    targetHeads: await collectTargetHeads(assetsDirectory),
    manifest,
    errors,
  };
  if (errors.length > 0) {
    throw new Error(
      `Production asset integrity failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
  return result;
}

async function resolveAssetsDirectory(siteRoot) {
  const configuration = await readFile(
    path.join(siteRoot, "wrangler.jsonc"),
    "utf8",
  );
  const parsed = JSON.parse(stripJsonComments(configuration));
  const directory = parsed.assets?.directory;
  if (typeof directory !== "string" || directory.length === 0) {
    throw new Error("wrangler.jsonc must define assets.directory.");
  }
  return path.resolve(siteRoot, directory);
}

async function checkHtmlAssets({ assetsDirectory, htmlFile }) {
  const html = await readFile(htmlFile, "utf8");
  const tags = parseHtmlTags(html);
  const documentName = path.relative(assetsDirectory, htmlFile);
  const baseReference = findBaseReference(tags);
  const stylesheets = tags.filter(
    (tag) => isStylesheet(tag) && !isExternalReference(tag.attributes.href),
  );
  const scripts = tags.filter(
    (tag) =>
      isExecutableScript(tag) && !isExternalReference(tag.attributes.src),
  );
  const isRedirect = tags.some(
    (tag) =>
      tag.name === "meta" &&
      tag.attributes["http-equiv"]?.toLowerCase() === "refresh" &&
      typeof tag.attributes.content === "string" &&
      /\burl=/iu.test(tag.attributes.content),
  );

  const errors = [];
  if (!isRedirect && stylesheets.length === 0)
    errors.push(`${documentName} has no local stylesheet reference.`);
  if (!isRedirect && scripts.length === 0)
    errors.push(`${documentName} has no local JavaScript reference.`);
  for (const stylesheet of stylesheets) {
    errors.push(
      ...(await verifyAssetReference({
        assetsDirectory,
        htmlFile,
        documentName,
        reference: stylesheet.attributes.href,
        baseReference,
        kind: "CSS",
        requireContent: true,
      })),
    );
  }
  for (const script of scripts) {
    errors.push(
      ...(await verifyAssetReference({
        assetsDirectory,
        htmlFile,
        documentName,
        reference: script.attributes.src,
        baseReference,
        kind: "JavaScript",
        requireContent: false,
      })),
    );
  }
  return {
    documentName,
    stylesheets: stylesheets.length,
    scripts: scripts.length,
    isRedirect,
    errors,
  };
}

import {
  collectFiles,
  findBaseReference,
  isExecutableScript,
  isExternalReference,
  isStylesheet,
  parseHtmlTags,
  verifyAssetReference,
} from "./check_asset_html.mjs";
import { checkClientManifest } from "./check_asset_manifest.mjs";
import { collectTargetHeads, stripJsonComments } from "./check_asset_util.mjs";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const siteRoot = process.argv[2] ?? path.join(repositoryRoot, "website");
  try {
    const result = await checkProductionAssetIntegrity({ siteRoot });
    console.log(
      `Production asset integrity passed: ${result.htmlFileCount} HTML files; CSS ${result.stylesheetReferenceCount} (${result.pagesWithStylesheets} pages, missing ${result.pagesWithoutStylesheets.length}); JavaScript ${result.scriptReferenceCount} (${result.pagesWithScripts} pages, missing ${result.pagesWithoutScripts.length}); manifest CSS entries ${result.manifest.cssEntryCount}.`,
    );
    console.log(
      `Manifest entries: ${Object.entries(result.manifest.entries)
        .map(([key, moduleId]) => `${key} -> ${moduleId}`)
        .join(", ")}`,
    );
    for (const [page, head] of Object.entries(result.targetHeads))
      console.log(
        `${page} head assets: ${head === null ? "not found" : JSON.stringify(head)}`,
      );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
