import path from "node:path";
import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  ContentManager,
  getResolvedPluginMetadata,
  readContentBuildStateStatus,
  readOnlyContentGraph,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import {
  contentSourceName,
  resolveProjectContentSource,
} from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";
import type {
  ApplicationInspection,
  BuildInspection,
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
      excludeCount: config.content.exclude.length,
      publishStrategy: config.content.filters.publishStrategy,
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

export async function collectContentInspection(
  config: ResolvedRiebeckiteConfig,
  project: RiebeckiteProject,
): Promise<ContentInspection> {
  const source = resolveProjectContentSource(config, project);
  const paths = (await source.scan())
    .map((entry) => entry.path)
    .toSorted((left, right) => left.localeCompare(right));
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
    extensions,
    paths: await inspectPaths(config, source, paths),
  };
}

async function inspectPaths(
  config: ResolvedRiebeckiteConfig,
  source: ContentSource,
  paths: readonly string[],
): Promise<ContentInspection["paths"]> {
  const locations = await new ContentManager(source, [], {
    config,
  }).getContentLocations();
  return paths.map((path) => {
    if (!path.endsWith(".md")) return { path };
    const location = locations.get(path.replace(/\.md$/, ""));
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
  const locations = await new ContentManager(source, [], {
    config,
  }).getContentLocations();
  const graph = await readOnlyContentGraph(source, locations);
  const nodes = graph.nodes();
  const mostLinked = nodes
    .map((node) => ({
      path: `${node.slug}.md`,
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

export async function collectBuildInspection(
  config: ResolvedRiebeckiteConfig,
): Promise<BuildInspection> {
  const status = await readContentBuildStateStatus(
    resolveContentBuildStatePath(config, undefined),
  );
  if (status.kind === "missing") return { status: "not created" };
  if (status.kind === "invalid")
    return { status: "invalid", reason: status.reason };
  return {
    status: "valid",
    version: status.version,
    entryCount: status.entryCount,
  };
}

function displayPath(value: string, invocationCwd: string): string {
  return path.relative(invocationCwd, value) || ".";
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}
