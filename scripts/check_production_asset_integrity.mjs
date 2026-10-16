import { readdir, readFile, stat } from "node:fs/promises";
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

function isStylesheet(tag) {
  return (
    tag.name === "link" &&
    typeof tag.attributes.href === "string" &&
    tag.attributes.rel
      ?.split(/\s+/u)
      .some((value) => value.toLowerCase() === "stylesheet")
  );
}

function isExecutableScript(tag) {
  if (tag.name !== "script" || typeof tag.attributes.src !== "string")
    return false;
  const type = tag.attributes.type?.toLowerCase();
  return (
    type === undefined ||
    type === "module" ||
    /javascript|ecmascript/u.test(type)
  );
}

function findBaseReference(tags) {
  return tags.find((tag) => tag.name === "base")?.attributes.href;
}

async function verifyAssetReference(input) {
  const assetPath = resolveAssetPath(input);
  if (!assetPath) {
    return [
      `${input.documentName} has an invalid ${input.kind} reference: ${input.reference}`,
    ];
  }
  let assetInfo;
  try {
    assetInfo = await stat(assetPath);
  } catch {
    return [
      `${input.documentName} references missing ${input.kind} asset: ${input.reference}`,
    ];
  }
  if (!assetInfo.isFile()) {
    return [
      `${input.documentName} references a non-file ${input.kind} asset: ${input.reference}`,
    ];
  }
  if (input.requireContent && assetInfo.size === 0) {
    return [
      `${input.documentName} references an empty CSS asset: ${input.reference}`,
    ];
  }
  return [];
}

async function checkClientManifest(assetsDirectory) {
  const manifestPath = path.join(assetsDirectory, ".vite", "manifest.json");
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    errors.push(
      `Vite client manifest is unavailable: ${path.relative(assetsDirectory, manifestPath)}`,
    );
    return {
      path: manifestPath,
      exists: false,
      cssEntryCount: 0,
      entries: {},
      errors,
    };
  }
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    errors.push("Vite client manifest must be an object.");
    return {
      path: manifestPath,
      exists: true,
      cssEntryCount: 0,
      entries: {},
      errors,
    };
  }
  const entries = manifest;
  const diagnostics = Object.fromEntries(
    ["app/style.css", "app/client.ts"].flatMap((key) => {
      const entry = entries[key];
      if (typeof entry !== "object" || entry === null) return [];
      return [[key, entry.src ?? key]];
    }),
  );
  const cssEntryCount = Object.values(entries).filter((entry) =>
    hasCssAsset(entry),
  ).length;
  if (cssEntryCount === 0)
    errors.push("Vite client manifest has no CSS asset entries.");
  for (const key of ["app/style.css", "app/client.ts"]) {
    if (!Object.hasOwn(entries, key))
      errors.push(`Vite client manifest is missing ${key}.`);
  }
  for (const [key, entry] of Object.entries(entries)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      errors.push(`Vite client manifest entry ${key} is invalid.`);
      continue;
    }
    for (const asset of collectManifestAssets(entry)) {
      errors.push(...(await verifyManifestAsset(assetsDirectory, key, asset)));
    }
  }
  return {
    path: manifestPath,
    exists: true,
    cssEntryCount,
    entries: diagnostics,
    errors,
  };
}

function hasCssAsset(entry) {
  return collectManifestAssets(entry).some((asset) => asset.endsWith(".css"));
}

function collectManifestAssets(entry) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry))
    return [];
  const paths = [
    entry.file,
    ...(Array.isArray(entry.css) ? entry.css : []),
    ...(Array.isArray(entry.assets) ? entry.assets : []),
  ];
  return paths.filter((asset) => typeof asset === "string");
}

async function verifyManifestAsset(assetsDirectory, key, asset) {
  const assetPath = path.resolve(assetsDirectory, asset);
  const relativePath = path.relative(assetsDirectory, assetPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return [`Vite client manifest entry ${key} has an invalid asset: ${asset}`];
  }
  try {
    const info = await stat(assetPath);
    if (!info.isFile())
      return [
        `Vite client manifest entry ${key} references a non-file asset: ${asset}`,
      ];
    if (asset.endsWith(".css") && info.size === 0)
      return [
        `Vite client manifest entry ${key} references an empty CSS asset: ${asset}`,
      ];
    return [];
  } catch {
    return [
      `Vite client manifest entry ${key} references a missing asset: ${asset}`,
    ];
  }
}

async function collectTargetHeads(assetsDirectory) {
  const result = {};
  for (const name of ["index.html", "README.html"]) {
    try {
      const html = await readFile(path.join(assetsDirectory, name), "utf8");
      const tags = parseHtmlTags(
        html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1] ?? "",
      );
      result[name] = {
        stylesheets: tags
          .filter(isStylesheet)
          .map((tag) => tag.attributes.href),
        scripts: tags
          .filter(isExecutableScript)
          .map((tag) => tag.attributes.src),
      };
    } catch {
      result[name] = null;
    }
  }
  return result;
}

function resolveAssetPath({
  assetsDirectory,
  htmlFile,
  reference,
  baseReference,
}) {
  const documentUrl = new URL(
    path.relative(assetsDirectory, htmlFile).replaceAll("\\", "/"),
    "https://assets.invalid/",
  );
  const baseUrl =
    baseReference && !isExternalReference(baseReference)
      ? new URL(baseReference, documentUrl)
      : documentUrl;
  let resolved;
  try {
    resolved = new URL(reference, baseUrl);
  } catch {
    return null;
  }
  if (resolved.origin !== "https://assets.invalid") return null;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(resolved.pathname);
  } catch {
    return null;
  }
  const assetPath = path.resolve(assetsDirectory, `.${decodedPath}`);
  const relativePath = path.relative(assetsDirectory, assetPath);
  return relativePath.startsWith("..") || path.isAbsolute(relativePath)
    ? null
    : assetPath;
}

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(reference);
}

function parseHtmlTags(html) {
  const tags = [];
  for (let position = 0; position < html.length; position += 1) {
    if (html[position] !== "<" || html[position + 1] === "/") continue;
    const end = findTagEnd(html, position + 1);
    if (end === -1) break;
    const tag = parseTag(html.slice(position + 1, end));
    if (tag) tags.push(tag);
    position = end;
  }
  return tags;
}

function findTagEnd(html, start) {
  let quote = null;
  for (let position = start; position < html.length; position += 1) {
    const character = html[position];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return position;
    }
  }
  return -1;
}

function parseTag(source) {
  const name = source.match(/^\s*([a-z][\w:-]*)/iu)?.[1]?.toLowerCase();
  if (!name) return null;
  const attributes = {};
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
  const content = source.slice(source.indexOf(name) + name.length);
  for (const match of content.matchAll(pattern)) {
    const attribute = match[1].toLowerCase();
    if (attribute === "/") continue;
    attributes[attribute] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return { name, attributes };
}

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(entryPath, extension);
      return entry.isFile() && entry.name.endsWith(extension)
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat();
}

function stripJsonComments(source) {
  let result = "";
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote) {
      result += character;
      if (character === "\\") result += source[++index] ?? "";
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"') {
      quote = character;
      result += character;
    } else if (character === "/" && next === "/") {
      index = source.indexOf("\n", index);
      if (index === -1) break;
      result += "\n";
    } else if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 1;
    } else {
      result += character;
    }
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const siteRoot = process.argv[2] ?? path.join(repositoryRoot, "apps", "web");
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
