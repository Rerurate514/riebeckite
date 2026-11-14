import path from "node:path";
import {
  ContentManager,
  type ContentSource,
  createContentFormatRegistry,
  getResolvedPluginMetadata,
  inspectContentAssets,
  isPersistentlyCacheable,
  type ResolvedRiebeckiteConfig,
  readOnlyContentGraph,
  resolveApiLifecycle,
} from "@riebeckite/core";
import { collectApiLifecycleDiagnostics } from "@riebeckite/diagnostics";
import { FileSystemContentSource } from "@riebeckite/node";
import type { RiebeckiteProject } from "../application_root.js";
import {
  contentSourceName,
  resolveProjectContentSource,
} from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";
import {
  collectBuildInspection,
  displayPath,
  sorted,
} from "./collectors_part2.js";
import type {
  ApiInspection,
  ApplicationInspection,
  AssetInspection,
  ConfigInspection,
  ContentInspection,
  GraphInspection,
  PluginInspection,
} from "./types.js";

export async function collectApplicationInspection(
  project: RiebeckiteProject,
): Promise<ApplicationInspection> {
  const config = await loadProjectConfig(project);
  const [content, build] = await Promise.all([
    collectContentInspection(config, project),
    collectBuildInspection(config),
  ]);
  const plugins = getResolvedPluginMetadata(config.plugins);

  return {
    root: displayPath(project.projectRoot, project.invocationCwd),
    configPath: displayPath(project.configPath, project.invocationCwd),
    content: { source: content.source, entryCount: content.entryCount },
    plugins: {
      enabledCount: plugins.filter((plugin) => plugin.enabled).length,
      capabilityCount: new Set(plugins.flatMap((plugin) => plugin.provides))
        .size,
    },
    build,
  };
}

export async function collectConfigInspection(
  project: RiebeckiteProject,
): Promise<ConfigInspection> {
  const config = await loadProjectConfig(project);
  return {
    site: {
      title: config.site.title,
      baseUrl: config.site.baseUrl,
      locale: config.site.locale,
    },
    content: {
      source: contentSourceName(config),
      directory: config.content.directory,
      exclude: [...config.content.exclude],
      publishStrategy: config.content.filters.publishStrategy,
    },
    cache: {
      enabled: config.cache.enabled,
      directory: config.cache.directory,
      persistentCache: isPersistentlyCacheable("", config),
    },
    theme: { name: config.theme.name, colorMode: config.theme.colorMode },
    pluginCount: config.plugins.length,
  };
}

export async function collectPluginInspections(
  project: RiebeckiteProject,
): Promise<readonly PluginInspection[]> {
  const config = await loadProjectConfig(project);
  return getResolvedPluginMetadata(config.plugins).map((plugin, index) => ({
    ...plugin,
    order: index + 1,
    provides: sorted(plugin.provides),
    requires: sorted(plugin.requires),
    optional: sorted(plugin.optional),
  }));
}

export async function collectApiInspection(
  project: RiebeckiteProject,
): Promise<ApiInspection> {
  const config = await loadProjectConfig(project);
  const registry = resolveApiLifecycle(config);
  const usedIds = collectApiLifecycleDiagnostics(config)
    .filter(
      (diagnostic) =>
        diagnostic.category === "api" && diagnostic.severity === "warning",
    )
    .map((diagnostic) => diagnostic.subject.value)
    .filter((value): value is string => value !== undefined);
  return {
    entries: registry.entries,
    issues: registry.issues,
    deprecated: registry.deprecated(),
    usedIds: [...new Set(usedIds)].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

export async function collectContentInspection(
  config: ResolvedRiebeckiteConfig,
  project: RiebeckiteProject,
): Promise<ContentInspection> {
  const source = resolveProjectContentSource(config, project);
  const scan =
    source instanceof FileSystemContentSource
      ? await source.scanWithExclusions()
      : { entries: await source.scan(), exclusions: [] };
  const paths = scan.entries
    .map((entry) => entry.path)
    .toSorted((left, right) => left.localeCompare(right));
  const excluded = scan.exclusions.toSorted((left, right) =>
    left.path.localeCompare(right.path),
  );
  const extensions = Object.entries(
    paths.reduce<Record<string, number>>((counts, entryPath) => {
      const extension = path.posix.extname(entryPath).toLowerCase() || "(none)";
      counts[extension] = (counts[extension] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([extension, count]) => ({ extension, count }))
    .toSorted((left, right) => left.extension.localeCompare(right.extension));

  return {
    source: contentSourceName(config),
    entryCount: paths.length,
    excluded,
    extensions,
    paths: await inspectPaths(config, source, paths),
  };
}

export async function collectAssetInspection(
  project: RiebeckiteProject,
): Promise<AssetInspection> {
  const config = await loadProjectConfig(project);
  const source = resolveProjectContentSource(config, project);
  const manifest = await readOnlyContentManager(source, config).getManifest();
  const registry = createContentFormatRegistry(config.plugins);
  return {
    source: contentSourceName(config),
    report: await inspectContentAssets(manifest, source, {
      isContentPath: (entryPath) => registry.isContentPath(entryPath),
    }),
  };
}

export function readOnlyContentManager(
  source: ContentSource,
  config: ResolvedRiebeckiteConfig,
): ContentManager {
  return new ContentManager(source, [], {
    config: { ...config, cache: { ...config.cache, enabled: false } },
    commitBuildState: false,
  });
}

export async function inspectPaths(
  config: ResolvedRiebeckiteConfig,
  source: ContentSource,
  paths: readonly string[],
): Promise<ContentInspection["paths"]> {
  const locations = await readOnlyContentManager(
    source,
    config,
  ).getContentLocations();
  const registry = createContentFormatRegistry(config.plugins);
  return paths.map((path) => {
    const slug = registry.toSlug(path);
    if (slug === undefined) return { path };
    const location = locations.get(slug);
    return {
      path,
      id: location?.metadata?.id,
      idSource: location?.metadata?.idSource,
      permalink: location?.permalink,
    };
  });
}

export async function collectGraphInspection(
  project: RiebeckiteProject,
): Promise<GraphInspection> {
  const config = await loadProjectConfig(project);
  const source = resolveProjectContentSource(config, project);
  const locations = await readOnlyContentManager(
    source,
    config,
  ).getContentLocations();
  const graph = await readOnlyContentGraph(
    source,
    locations,
    createContentFormatRegistry(config.plugins),
  );
  const nodes = graph.nodes();
  const mostLinked = nodes
    .map((node) => ({
      path: node.sourcePath ?? node.slug,
      incomingCount: graph.incomingSlugs(node.slug).length,
    }))
    .toSorted(
      (left, right) =>
        right.incomingCount - left.incomingCount ||
        left.path.localeCompare(right.path),
    )
    .slice(0, 5);

  return {
    nodeCount: nodes.length,
    edgeCount: nodes.reduce(
      (count, node) => count + graph.outgoingSlugs(node.slug).length,
      0,
    ),
    mostLinked,
  };
}
