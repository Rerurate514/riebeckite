import {
  type ContentPublicLocation,
  definePlugin,
  extractFrontmatterAliases,
  type PluginContentLocationAugmentContext,
} from "@riebeckite/core";
import {
  type AliasOptions,
  type ResolvedAliasOptions,
  resolveAliasOptions,
  resolveAliasPath,
} from "./src/alias.js";

export type {
  AliasOptions,
  AliasRedirectStatus,
  ResolvedAliasOptions,
} from "./src/alias.js";
export { resolveAliasPath } from "./src/alias.js";

/**
 * Turns Obsidian `aliases` / `alias` frontmatter into site-local redirects.
 *
 * The plugin augments already-resolved public locations through
 * `extendContentLocations`, so it never has to reproduce (or override) the
 * canonical permalink another plugin produced: aliases are added as extra
 * redirect entries on top of whatever `permalink` resolved.
 */
export function alias(options: AliasOptions = {}) {
  const resolved = resolveAliasOptions(options);
  return definePlugin({
    name: "alias",
    // Localization finalizes permalinks and redirect paths (language prefixes),
    // so alias paths must be claimed and checked against the localized paths.
    optional: ["content.localization"],
    extendContentLocations: (context) => {
      applyAliases(context, resolved);
    },
  });
}

type PathOwner = {
  slug: string;
  kind: "permalink" | "redirect";
};

function applyAliases(
  context: PluginContentLocationAugmentContext,
  options: ResolvedAliasOptions,
): void {
  // Everything already claimed by a canonical permalink or another redirect is
  // reserved, so aliases never shadow a real route or silently replace an
  // existing redirect. Notes marked private never publish, so their paths stay
  // claimable by aliases for published notes.
  const privateSlugs = new Set(
    context.entries
      .filter((entry) => isPrivateMarkdown(entry.markdown))
      .map((entry) => entry.slug),
  );
  const owners = new Map<string, PathOwner>();
  for (const location of context.locations.values()) {
    if (privateSlugs.has(location.slug)) continue;
    reservePath(owners, location.permalink, location.slug, "permalink");
    for (const redirect of location.redirects ?? []) {
      reservePath(owners, redirect.path, location.slug, "redirect");
    }
  }

  for (const entry of context.entries) {
    const location = context.locations.get(entry.slug);
    if (!location) continue;
    const prefix = languagePrefix(location);

    for (const alias of extractFrontmatterAliases(entry.markdown)) {
      const localizedPath = resolveAliasPath(alias);
      if (!localizedPath) {
        context.diagnostics.push({
          code: "alias-invalid",
          severity: "warning",
          pluginName: "alias",
          filePath: entry.path,
          slug: entry.slug,
          message: `Alias "${alias}" cannot be used as a URL path and was skipped.`,
          suggestion:
            "Aliases must not contain '#', '?', '\\', empty or '.'/'..' segments, or malformed percent escapes.",
          meta: { alias },
        });
        continue;
      }
      const path = prefix + localizedPath;

      const maxSegmentLength = options.maxSegmentLength;
      if (
        maxSegmentLength !== undefined &&
        path.split("/").some((segment) => segment.length > maxSegmentLength)
      ) {
        context.diagnostics.push({
          code: "alias-too-long",
          severity: "warning",
          pluginName: "alias",
          filePath: entry.path,
          slug: entry.slug,
          target: path,
          message: `Alias "${alias}" resolves to ${path}, which has a path segment longer than ${maxSegmentLength} characters; the alias was skipped.`,
          suggestion: "Shorten the alias or raise maxSegmentLength.",
          meta: {
            alias,
            path,
            maxSegmentLength,
          },
        });
        continue;
      }

      const owner = owners.get(path);
      if (owner) {
        // An alias that already points at this same note (its canonical
        // permalink or another of its own redirects) is redundant, not a
        // conflict.
        if (owner.slug === entry.slug) continue;
        context.diagnostics.push({
          code: "alias-collision",
          severity: "warning",
          pluginName: "alias",
          filePath: entry.path,
          slug: entry.slug,
          target: path,
          message: `Alias "${alias}" resolves to ${path}, which is already used by "${owner.slug}" (${owner.kind}); the alias was skipped.`,
          suggestion:
            "Rename the alias or remove the conflicting permalink/redirect.",
          meta: { alias, path, conflictSlug: owner.slug },
        });
        continue;
      }

      reservePath(owners, path, entry.slug, "redirect");
      location.redirects = [
        ...(location.redirects ?? []),
        { path, status: options.status },
      ];
    }
  }
}

function reservePath(
  owners: Map<string, PathOwner>,
  path: string,
  slug: string,
  kind: PathOwner["kind"],
): void {
  if (!owners.has(path)) owners.set(path, { slug, kind });
}

function languagePrefix(location: ContentPublicLocation): string {
  const language = location.language;
  if (!language) return "";
  const firstSegment = location.permalink.split("/")[1] ?? "";
  return firstSegment.toLowerCase() === language.toLowerCase()
    ? `/${firstSegment}`
    : "";
}

/**
 * shortcut: reads only `private: true`; drafts and explicit unpublished stays
 * stay reserved, promote to full publishing-state lookup if that blocks users.
 */
function isPrivateMarkdown(markdown: string): boolean {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return frontmatter?.[1]
    ? /^private:\s*true\s*$/im.test(frontmatter[1])
    : false;
}
