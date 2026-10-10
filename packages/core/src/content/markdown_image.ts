import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Node } from "unist";
import { isImagePath, normalizeContentPath } from "./attachment.js";

type MarkdownImage = {
  readonly path: string;
  readonly url: string;
};

type MarkdownNode = Node & {
  url?: unknown;
  identifier?: unknown;
  children?: Node[];
};

export function extractMarkdownImages(
  markdown: string,
  sourceSlug: string,
): readonly MarkdownImage[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const definitions = new Map<string, string>();
  const references: string[] = [];
  const urls: string[] = [];

  visitMarkdownNodes(tree, (node) => {
    if (node.type === "definition" && typeof node.url === "string") {
      const identifier = normalizeIdentifier(node.identifier);
      if (identifier) definitions.set(identifier, node.url);
    }
    if (node.type === "image" && typeof node.url === "string") {
      urls.push(node.url);
    }
    if (node.type === "imageReference") {
      const identifier = normalizeIdentifier(node.identifier);
      if (identifier) references.push(identifier);
    }
  });

  for (const reference of references) {
    const url = definitions.get(reference);
    if (url) urls.push(url);
  }

  return uniqueImages(
    urls
      .map((url) => resolveMarkdownImage(url, sourceSlug))
      .filter((image): image is MarkdownImage => image !== null),
  );
}

export function normalizeMarkdownImages(sourceSlug: string) {
  return () => (tree: Node) => {
    const definitions = new Map<string, MarkdownNode>();
    const references = new Set<string>();

    visitMarkdownNodes(tree, (node) => {
      if (node.type === "definition" && typeof node.url === "string") {
        const identifier = normalizeIdentifier(node.identifier);
        if (identifier) definitions.set(identifier, node);
      }
      if (node.type === "image" && typeof node.url === "string") {
        const image = resolveMarkdownImage(node.url, sourceSlug);
        if (image) node.url = image.url;
      }
      if (node.type === "imageReference") {
        const identifier = normalizeIdentifier(node.identifier);
        if (identifier) references.add(identifier);
      }
    });

    for (const identifier of references) {
      const definition = definitions.get(identifier);
      if (!definition || typeof definition.url !== "string") continue;
      const image = resolveMarkdownImage(definition.url, sourceSlug);
      if (image) definition.url = image.url;
    }
  };
}

function resolveMarkdownImage(
  input: string,
  sourceSlug: string,
): MarkdownImage | null {
  if (input.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return null;
  }
  const [pathAndQuery, hash = ""] = splitOnce(input, "#");
  const [rawPath, query = ""] = splitOnce(pathAndQuery, "?");
  const decodedPath = decodeUriPath(rawPath);
  if (!decodedPath || !isImagePath(decodedPath)) return null;

  const path = resolveContentAssetPath(sourceSlug, decodedPath);
  if (!path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const suffix = `${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  return { path, url: `/${encodedPath}${suffix}` };
}

function resolveContentAssetPath(
  sourceSlug: string,
  targetPath: string,
): string | null {
  const sourceDirectory = sourceSlug.includes("/")
    ? sourceSlug.slice(0, sourceSlug.lastIndexOf("/"))
    : "";
  const parts = [
    ...(targetPath.startsWith("/") ? [] : sourceDirectory.split("/")),
    ...normalizeContentPath(targetPath).replace(/^\/+/, "").split("/"),
  ];
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalized.length === 0) return null;
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.length > 0 ? normalized.join("/").normalize("NFC") : null;
}

function visitMarkdownNodes(
  node: Node,
  visitor: (node: MarkdownNode) => void,
): void {
  const markdownNode = node as MarkdownNode;
  visitor(markdownNode);
  for (const child of markdownNode.children ?? [])
    visitMarkdownNodes(child, visitor);
}

function normalizeIdentifier(value: unknown): string | null {
  return typeof value === "string" ? value.toLowerCase() : null;
}

function decodeUriPath(path: string): string | null {
  try {
    return decodeURI(path);
  } catch {
    return null;
  }
}

function splitOnce(value: string, separator: string): [string, string?] {
  const index = value.indexOf(separator);
  return index < 0 ? [value] : [value.slice(0, index), value.slice(index + 1)];
}

function uniqueImages(
  images: readonly MarkdownImage[],
): readonly MarkdownImage[] {
  return [...new Map(images.map((image) => [image.path, image])).values()];
}
