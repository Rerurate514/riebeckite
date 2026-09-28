import {
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
    extendContentLocations: (context) => {
      applyAliases(context, resolved);
    },
  });
}

export const aliasPlugin = alias;

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
  // existing redirect.
  const owners = new Map<string, PathOwner>();
  for (const location of context.locations.values()) {
    reservePath(owners, location.permalink, location.slug, "permalink");
    for (const redirect of location.redirects ?? []) {
      reservePath(owners, redirect.path, location.slug, "redirect");
    }
  }

  for (const entry of context.entries) {
    const location = context.locations.get(entry.slug);
    if (!location) continue;

    for (const alias of extractFrontmatterAliases(entry.markdown)) {
      const path = resolveAliasPath(alias);
      if (!path) {
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
