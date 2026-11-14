import { readdir } from "node:fs/promises";
import path from "node:path";

export function isStylesheet(tag) {
  return (
    tag.name === "link" &&
    typeof tag.attributes.href === "string" &&
    tag.attributes.rel
      ?.split(/\s+/u)
      .some((value) => value.toLowerCase() === "stylesheet")
  );
}

export function isExecutableScript(tag) {
  if (tag.name !== "script" || typeof tag.attributes.src !== "string")
    return false;
  const type = tag.attributes.type?.toLowerCase();
  return (
    type === undefined ||
    type === "module" ||
    /javascript|ecmascript/u.test(type)
  );
}

export function findBaseReference(tags) {
  return tags.find((tag) => tag.name === "base")?.attributes.href;
}

export async function verifyAssetReference(input) {
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

export function resolveAssetPath({
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

export function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(reference);
}

export function parseHtmlTags(html) {
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

export function findTagEnd(html, start) {
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

export function parseTag(source) {
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

export async function collectFiles(directory, extension) {
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
