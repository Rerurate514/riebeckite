import { createHash } from "node:crypto";
import {
  attachErrorPath,
  type ContentLocationInput,
  type ContentPublicLocation,
  definePlugin,
  type PostFrontmatter,
} from "@riebeckite/core";
import { parse } from "yaml";

export type PermalinkIdStrategy =
  | "frontmatter"
  | "hash"
  | "frontmatter-or-hash";
export type PermalinkPathMode = "flat" | "preserve" | "append";
export type RedirectStatus = 301 | 302 | 307 | 308;

type ResolverContent = Pick<ContentLocationInput, "slug" | "path"> & {
  frontmatter: PostFrontmatter;
};

export type PermalinkOptions = {
  frontmatter?: string;
  id?: { strategy?: PermalinkIdStrategy; length?: number };
  path?: { mode?: PermalinkPathMode; prefix?: string; trailingSlash?: boolean };
  index?: { collapse?: boolean };
  override?: { frontmatter?: string };
  redirects?: { frontmatter?: string; status?: RedirectStatus };
  resolveId?: (content: ResolverContent) => string;
  resolvePath?: (input: { content: ResolverContent; id: string }) => string;
};

type ResolvedOptions = {
  frontmatter: string;
  strategy: PermalinkIdStrategy;
  hashLength: number;
  mode: PermalinkPathMode;
  prefix: string;
  trailingSlash: boolean;
  collapseIndex: boolean;
  overrideField: string;
  redirectsField: string;
  redirectStatus: RedirectStatus;
};

export function permalink(options: PermalinkOptions = {}) {
  const resolved = resolveOptions(options);
  return definePlugin({
    name: "permalink",
    resolveContentLocations: ({ entries }) => {
      const contents = entries.map((entry) => ({
        ...entry,
        frontmatter: parseFrontmatter(entry),
      }));
      const locations = contents.map((content) =>
        resolveLocation(content, options, resolved),
      );
      assertNoCollisions(locations, contents);
      return locations;
    },
  });
}

export const permalinkPlugin = permalink;

function resolveLocation(
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

function idSource(
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

function resolveId(content: ResolverContent, options: ResolvedOptions): string {
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

function composePath(
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

function createPathId(path: string, length: number): string {
  const normalized = path
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .normalize("NFC");
  return createHash("sha256")
    .update(normalized, "utf8")
    .digest("base64url")
    .slice(0, length);
}

function parseFrontmatter(entry: ContentLocationInput): PostFrontmatter {
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

function resolveOptions(options: PermalinkOptions): ResolvedOptions {
  const frontmatter = options.frontmatter ?? "id";
  const strategy = options.id?.strategy ?? "frontmatter-or-hash";
  const hashLength = options.id?.length ?? 12;
  if (!Number.isInteger(hashLength) || hashLength < 6 || hashLength > 43) {
    throw new Error(
      "Permalink hash ID length must be an integer from 6 through 43.",
    );
  }
  const mode = options.path?.mode ?? "flat";
  if (!(["flat", "preserve", "append"] as const).includes(mode)) {
    throw new Error(`Invalid permalink path mode: ${mode}`);
  }
  const redirectStatus = options.redirects?.status ?? 308;
  if (!([301, 302, 307, 308] as const).includes(redirectStatus)) {
    throw new Error(`Invalid permalink redirect status: ${redirectStatus}`);
  }
  return {
    frontmatter: validateFieldName(frontmatter, "ID"),
    strategy,
    hashLength,
    mode,
    prefix: normalizePrefix(options.path?.prefix ?? "/n"),
    trailingSlash: options.path?.trailingSlash ?? false,
    collapseIndex: options.index?.collapse ?? true,
    overrideField: validateFieldName(
      options.override?.frontmatter ?? "permalink",
      "override",
    ),
    redirectsField: validateFieldName(
      options.redirects?.frontmatter ?? "redirect_from",
      "redirect",
    ),
    redirectStatus,
  };
}

function assertNoCollisions(
  locations: readonly ContentPublicLocation[],
  contents: readonly ResolverContent[],
): void {
  const bySlug = new Map(contents.map((content) => [content.slug, content]));
  const ids = new Map<string, ContentPublicLocation>();
  const paths = new Map<
    string,
    { location: ContentPublicLocation; kind: "canonical" | "redirect" }
  >();
  for (const location of locations) {
    const id = location.metadata?.id;
    if (id) assertUnique(ids, id, location, bySlug, "Permalink ID collision");
    assertPathUnique(paths, location.permalink, location, "canonical", bySlug);
    for (const redirect of location.redirects ?? []) {
      assertPathUnique(paths, redirect.path, location, "redirect", bySlug);
    }
  }
}

function assertUnique(
  values: Map<string, ContentPublicLocation>,
  key: string,
  next: ContentPublicLocation,
  contents: Map<string, ResolverContent>,
  heading: string,
): void {
  const previous = values.get(key);
  if (previous)
    throw collisionError(heading, key, previous, next, contents, "ID", "ID");
  values.set(key, next);
}

function assertPathUnique(
  values: Map<
    string,
    { location: ContentPublicLocation; kind: "canonical" | "redirect" }
  >,
  key: string,
  next: ContentPublicLocation,
  kind: "canonical" | "redirect",
  contents: Map<string, ResolverContent>,
): void {
  const previous = values.get(key);
  if (previous)
    throw collisionError(
      "Permalink URL collision",
      key,
      previous.location,
      next,
      contents,
      previous.kind,
      kind,
    );
  values.set(key, { location: next, kind });
}

function collisionError(
  heading: string,
  key: string,
  first: ContentPublicLocation,
  second: ContentPublicLocation,
  contents: Map<string, ResolverContent>,
  firstKind: string,
  secondKind: string,
): Error {
  return new Error(
    `${heading}: ${key}\n\n- ${contents.get(first.slug)?.path ?? first.slug} (${firstKind})\n- ${contents.get(second.slug)?.path ?? second.slug} (${secondKind})`,
  );
}

function readOptionalString(
  frontmatter: PostFrontmatter,
  field: string,
): string | null {
  const value = frontmatter[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string")
    throw new Error(`Permalink frontmatter field "${field}" must be a string.`);
  return value.trim() || null;
}

function readRedirects(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  throw new Error(
    `Permalink redirect field must be a string or string array: ${path}`,
  );
}

function hasFrontmatterId(
  frontmatter: PostFrontmatter,
  field: string,
): boolean {
  return (
    typeof frontmatter[field] === "string" &&
    frontmatter[field].trim().length > 0
  );
}

function validateId(value: string, path: string): string {
  const id = value.trim();
  const decoded = hasMalformedPercentEncoding(id)
    ? null
    : decodeURIComponent(id);
  if (
    !id ||
    !decoded ||
    decoded === "." ||
    decoded === ".." ||
    /[\\/#?]/.test(decoded) ||
    /\s/.test(decoded)
  ) {
    throw new Error(
      `Invalid permalink ID "${value}" in ${path}. IDs must be a non-empty single path segment.`,
    );
  }
  return id;
}

function normalizePrefix(value: string): string {
  if (!value.trim() || value.trim() === "/") return "";
  return normalizePath(value, false);
}

function normalizePath(value: string, trailingSlash: boolean): string {
  const raw = value.trim();
  if (
    raw.length === 0 ||
    !raw.startsWith("/") ||
    raw.includes("?") ||
    raw.includes("#") ||
    raw.includes("\\") ||
    raw.includes("//")
  ) {
    throw new Error(
      `Invalid permalink path: "${value}". It must be a site-local absolute path.`,
    );
  }
  const segments = raw
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (
        segment === "." ||
        segment === ".." ||
        hasMalformedPercentEncoding(segment)
      ) {
        throw new Error(`Invalid permalink path: "${value}".`);
      }
      return encodeURIComponent(decodeURIComponent(segment));
    });
  const path = `/${segments.join("/")}`;
  if (path === "/") return "/";
  return trailingSlash ? `${path}/` : path;
}

function joinPath(prefix: string, ...segments: string[]): string {
  return [
    prefix,
    ...segments.map((segment) =>
      encodeURIComponent(decodeURIComponent(segment)),
    ),
  ]
    .filter(Boolean)
    .join("/")
    .replace(/^([^/])/, "/$1");
}

function hasMalformedPercentEncoding(value: string): boolean {
  try {
    decodeURIComponent(value);
    return false;
  } catch {
    return true;
  }
}

function validateFieldName(value: string, label: string): string {
  if (!value.trim() || /[.[\]]/.test(value))
    throw new Error(`Permalink ${label} frontmatter field must be top-level.`);
  return value;
}
