import { resolvePluginDependencies } from "../plugin/plugin_dependency.js";
import type {
  PluginInput,
  ResolvedPluginMetadata,
  RiebeckitePlugin,
} from "./plugin_part1.js";

export function definePlugin<TOptions>(
  plugin: RiebeckitePlugin<TOptions>,
): RiebeckitePlugin<TOptions> {
  return plugin;
}

export function resolvePlugins(
  plugins: PluginInput[] = [],
): RiebeckitePlugin[] {
  const orderedPlugins = plugins
    .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
    .filter((plugin) => plugin.enabled !== false)
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));

  assertUniquePluginNames(orderedPlugins);
  assertUniqueMarkdownComponentNames(orderedPlugins);
  assertUniqueHastTransformNames(orderedPlugins);

  return resolvePluginDependencies(orderedPlugins);
}

export function assertUniqueMarkdownComponentNames(
  plugins: readonly RiebeckitePlugin[],
): void {
  assertUniqueNames(
    plugins,
    (plugin) => plugin.markdownComponents ?? [],
    "Markdown component",
  );
}

export function assertUniqueHastTransformNames(
  plugins: readonly RiebeckitePlugin[],
): void {
  assertUniqueNames(
    plugins,
    (plugin) => plugin.hastTransforms ?? [],
    "HAST transform",
  );
}

export function assertUniqueNames(
  plugins: readonly RiebeckitePlugin[],
  select: (plugin: RiebeckitePlugin) => readonly { name: string }[],
  label: string,
): void {
  const owners = new Map<string, string>();
  for (const plugin of plugins) {
    for (const item of select(plugin)) {
      const previous = owners.get(item.name);
      if (previous !== undefined) {
        throw new Error(
          `${label} "${item.name}" is provided by both "${previous}" and "${plugin.name}".`,
        );
      }
      owners.set(item.name, plugin.name);
    }
  }
}

export function assertUniquePluginNames(
  plugins: readonly RiebeckitePlugin[],
): void {
  const owners = new Map<string, number>();
  plugins.forEach((plugin, index) => {
    const previous = owners.get(plugin.name);
    if (previous !== undefined) {
      throw new Error(
        `Plugin name "${plugin.name}" is used by both plugins[${previous}] and plugins[${index}]`,
      );
    }
    owners.set(plugin.name, index);
  });
}

export function getResolvedPluginMetadata(
  plugins: readonly RiebeckitePlugin[],
): readonly ResolvedPluginMetadata[] {
  return plugins.map((plugin) => ({
    name: plugin.name,
    enabled: plugin.enabled !== false,
    provides: plugin.provides ?? [],
    requires: plugin.requires ?? [],
    optional: plugin.optional ?? [],
  }));
}
