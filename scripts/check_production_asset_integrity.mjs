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

  for (const htmlFile of htmlFiles) {
    await checkHtmlAssets({ assetsDirectory, htmlFile });
  }

  return { assetsDirectory, htmlFileCount: htmlFiles.length };
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

  if (stylesheets.length === 0) {
    throw new Error(`${documentName} has no local stylesheet reference.`);
  }
  if (scripts.length === 0) {
    throw new Error(`${documentName} has no local JavaScript reference.`);
  }

  for (const stylesheet of stylesheets) {
    await verifyAssetReference({
      assetsDirectory,
      htmlFile,
      documentName,
      reference: stylesheet.attributes.href,
      baseReference,
      kind: "CSS",
      requireContent: true,
    });
  }
  for (const script of scripts) {
    await verifyAssetReference({
      assetsDirectory,
      htmlFile,
      documentName,
      reference: script.attributes.src,
      baseReference,
      kind: "JavaScript",
      requireContent: false,
    });
  }
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
    throw new Error(
      `${input.documentName} has an invalid ${input.kind} reference: ${input.reference}`,
    );
  }
  let assetInfo;
  try {
    assetInfo = await stat(assetPath);
  } catch {
    throw new Error(
      `${input.documentName} references missing ${input.kind} asset: ${input.reference}`,
    );
  }
  if (!assetInfo.isFile()) {
    throw new Error(
      `${input.documentName} references a non-file ${input.kind} asset: ${input.reference}`,
    );
  }
  if (input.requireContent && assetInfo.size === 0) {
    throw new Error(
      `${input.documentName} references an empty CSS asset: ${input.reference}`,
    );
  }
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
  const result = await checkProductionAssetIntegrity({ siteRoot });
  console.log(
    `Production asset integrity passed: ${result.htmlFileCount} HTML files in ${result.assetsDirectory}`,
  );
}
