import type { Node } from "unist";
import {
  LINK_INDEX_PREFIX,
  LINK_LOCATION_PREFIX,
} from "./content/content_dependency_tracker.js";
import type { MarkdownPipelineContext } from "./types/plugin_pipeline.js";

type LinkNormalizationContext = MarkdownPipelineContext & {
  recordLinkResolution?: (id: string, value: string) => void;
};

export function normalizeMarkdownLinks(context: LinkNormalizationContext) {
  return (tree: Node) => {
    visitMarkdownLinkNodes(tree, (node) => {
      const normalizedUrl = normalizeMarkdownLinkUrl(node.url, context);
      if (normalizedUrl) node.url = normalizedUrl;
    });
  };
}

export function resolveLinkDependencyValue(
  id: string,
  contentIndex: ReadonlyMap<string, string>,
  lookupPermalink: (slug: string) => string | undefined,
  isRoutable: ((slug: string) => boolean) | undefined,
): string {
  if (id.startsWith(LINK_INDEX_PREFIX)) {
    return contentIndex.get(id.slice(LINK_INDEX_PREFIX.length)) ?? "";
  }
  if (id.startsWith(LINK_LOCATION_PREFIX)) {
    const slug = id.slice(LINK_LOCATION_PREFIX.length);
    const permalink = lookupPermalink(slug);
    if (permalink === undefined) return "";
    if (isRoutable && !isRoutable(slug)) return "";
    return permalink;
  }
  return "";
}

type MarkdownLinkNode = Node & {
  url?: unknown;
  children?: Node[];
};

function visitMarkdownLinkNodes(
  node: Node,
  visitor: (node: { url: string }) => void,
): void {
  const linkNode = node as MarkdownLinkNode;
  if (
    (node.type === "link" || node.type === "definition") &&
    typeof linkNode.url === "string"
  ) {
    visitor(linkNode as { url: string });
  }

  for (const child of linkNode.children ?? []) {
    visitMarkdownLinkNodes(child, visitor);
  }
}

function normalizeMarkdownLinkUrl(
  url: string,
  context: LinkNormalizationContext,
): string | null {
  if (!context.sourceSlug) return null;
  if (!isMarkdownContentLink(url)) return null;

  const [pathAndQuery, hash = ""] = splitOnce(url, "#");
  const [rawPath, query = ""] = splitOnce(pathAndQuery, "?");
  const decodedPath = decodeUriPath(rawPath);
  if (!decodedPath?.toLowerCase().endsWith(".md")) return null;

  const resolvedSlug = resolveRelativeMarkdownSlug(
    context.sourceSlug,
    decodedPath,
  );
  if (!resolvedSlug) return null;

  const indexedSlug = getExactContentSlug(context, resolvedSlug);
  if (!indexedSlug) return null;
  recordLinkResolution(context, LINK_LOCATION_PREFIX, indexedSlug);
  if (context.isRoutable && !context.isRoutable(indexedSlug)) return null;

  const suffix = `${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  return `${context.resolvePermalink(indexedSlug)}${suffix}`;
}

function recordLinkResolution(
  context: LinkNormalizationContext,
  prefix: string,
  key: string,
): void {
  if (!context.recordLinkResolution) return;
  const value =
    prefix === LINK_INDEX_PREFIX
      ? (context.contentIndex.get(key) ?? "")
      : resolveLinkDependencyValue(
          `${prefix}${key}`,
          context.contentIndex,
          (slug) => {
            try {
              return context.resolvePermalink(slug);
            } catch {
              return undefined;
            }
          },
          context.isRoutable,
        );
  context.recordLinkResolution(`${prefix}${key}`, value);
}

function getExactContentSlug(
  context: LinkNormalizationContext,
  slug: string,
): string | null {
  try {
    context.resolvePermalink(slug);
    return slug;
  } catch {
    const indexKey = slug.toLowerCase();
    recordLinkResolution(context, LINK_INDEX_PREFIX, indexKey);
    return context.contentIndex.get(indexKey) ?? null;
  }
}

function isMarkdownContentLink(url: string): boolean {
  if (url.startsWith("#") || url.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  return true;
}

function resolveRelativeMarkdownSlug(
  sourceSlug: string,
  targetPath: string,
): string | null {
  const sourceDirectory = sourceSlug.includes("/")
    ? sourceSlug.slice(0, sourceSlug.lastIndexOf("/"))
    : "";
  const baseParts = targetPath.startsWith("/")
    ? []
    : sourceDirectory.split("/");
  const parts = [...baseParts, ...targetPath.replace(/^\/+/, "").split("/")];
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalizedParts.length === 0) return null;
      normalizedParts.pop();
      continue;
    }
    normalizedParts.push(part);
  }

  return normalizedParts.join("/").replace(/\.md$/i, "");
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
  if (index < 0) return [value];
  return [value.slice(0, index), value.slice(index + separator.length)];
}
