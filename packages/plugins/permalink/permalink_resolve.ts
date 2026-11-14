import { createHash } from "node:crypto";
import {
  attachErrorPath,
  type ContentLocationInput,
  type ContentPublicLocation,
  type PostFrontmatter,
} from "@riebeckite/core";
import { parse } from "yaml";
import {
  joinPath,
  normalizePath,
  readOptionalString,
  readRedirects,
  validateId,
} from "./permalink_options.js";
import type {
  PermalinkOptions,
  ResolvedOptions,
  ResolverContent,
} from "./permalink_types.js";
import { hasFrontmatterId } from "./permalink_validate.js";

export function resolveLocation(
  content: ResolverContent,
  options: PermalinkOptions,
  resolved: ResolvedOptions,
): ContentPublicLocation {
  const override = readOptionalString(
    content.frontmatter,
    resolved.overrideField,
  );
  const explicitId = readOptionalString(
    content.frontmatter,
    resolved.frontmatter,
  );
  const id = override
    ? explicitId === null
      ? null
      : validateId(explicitId, content.path)
    : options.resolveId
      ? validateId(options.resolveId(content), content.path)
      : resolveId(content, resolved);
  const permalink = override
    ? normalizePath(override, resolved.trailingSlash)
    : normalizePath(
        options.resolvePath
          ? options.resolvePath({ content, id: id ?? "" })
          : composePath(content, id ?? "", resolved),
        resolved.trailingSlash,
      );
  const redirectValues = content.frontmatter[resolved.redirectsField];
  const redirects = readRedirects(redirectValues, content.path).map((path) => ({
    path: normalizePath(path, resolved.trailingSlash),
    status: resolved.redirectStatus,
  }));

  return {
    slug: content.slug,
    permalink,
    redirects,
    metadata: id
      ? {
          id,
          idSource: idSource(content, options, resolved, override !== null),
        }
      : undefined,
  };
}

export function idSource(
  content: ResolverContent,
  options: PermalinkOptions,
  resolved: ResolvedOptions,
  hasOverride: boolean,
): string {
  if (hasOverride) return "frontmatter";
  if (options.resolveId) return "custom";
  if (
    resolved.strategy === "hash" ||
    (resolved.strategy === "frontmatter-or-hash" &&
      !hasFrontmatterId(content.frontmatter, resolved.frontmatter))
  ) {
    return "derived";
  }
  return "frontmatter";
}

export function resolveId(
  content: ResolverContent,
  options: ResolvedOptions,
): string {
  const value = readOptionalString(content.frontmatter, options.frontmatter);
  if (options.strategy === "frontmatter") {
    if (!value) {
      throw new Error(
        `Permalink ID is required in frontmatter field "${options.frontmatter}": ${content.path}`,
      );
    }
    return validateId(value, content.path);
  }
  if (options.strategy === "frontmatter-or-hash" && value) {
    return validateId(value, content.path);
  }
  return createPathId(content.path, options.hashLength);
}

export function composePath(
  content: ResolverContent,
  id: string,
  options: ResolvedOptions,
): string {
  if (options.mode === "flat") return joinPath(options.prefix, id);
  const segments = content.slug.split("/");
  const fileName = segments.pop() ?? content.slug;
  if (options.mode === "preserve") {
    const directories =
      fileName === "index" && !options.collapseIndex
        ? [...segments, fileName]
        : segments;
    return joinPath(options.prefix, ...directories, id);
  }
  const appendSegments =
    fileName === "index" && options.collapseIndex
      ? segments
      : [...segments, fileName];
  return joinPath(options.prefix, ...appendSegments, id);
}

export function createPathId(path: string, length: number): string {
  const normalized = path
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .normalize("NFC");
  return createHash("sha256")
    .update(normalized, "utf8")
    .digest("base64url")
    .slice(0, length);
}

export function parseFrontmatter(entry: ContentLocationInput): PostFrontmatter {
  const match = entry.markdown.match(
    /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/,
  );
  if (!match) return {};
  let value: unknown;
  try {
    value = parse(match[1] ?? "");
  } catch (error) {
    throw attachErrorPath(error, entry.path);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid frontmatter object: ${entry.path}`);
  }
  return value as PostFrontmatter;
}
