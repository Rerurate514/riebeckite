import path from "node:path";
import {
  FileSystemContentSource,
  getResolvedPluginMetadata,
  readContentBuildStateStatus,
  readOnlyContentGraph,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { resolveHonoxApplicationRoot } from "@riebeckite/honox";
import type { RiebeckiteApplication } from "../application_root";
import { loadApplicationConfig } from "../load_config";
import type {
  ApplicationInspection,
  BuildInspection,
  ConfigInspection,
  ContentInspection,
  GraphInspection,
  PluginInspection,
} from "./types";

export async function collectApplicationInspection(
  application: RiebeckiteApplication,
): Promise<ApplicationInspection> {
  const config = await loadApplicationConfig(application);
  const [content, build] = await Promise.all([
    collectContentInspection(config, application),
    collectBuildInspection(config),
  ]);
  const plugins = getResolvedPluginMetadata(config.plugins);

  return {
    root: displayPath(application.applicationRoot),
    configPath: displayPath(application.configPath),
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
  application: RiebeckiteApplication,
): Promise<ConfigInspection> {
  const config = await loadApplicationConfig(application);
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
  application: RiebeckiteApplication,
): Promise<readonly PluginInspection[]> {
  const config = await loadApplicationConfig(application);
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
  application: RiebeckiteApplication,
): Promise<ContentInspection> {
  const source = await resolveContentSource(config, application);
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
    paths,
  };
}

export async function collectGraphInspection(
  application: RiebeckiteApplication,
): Promise<GraphInspection> {
  const config = await loadApplicationConfig(application);
  const graph = await readOnlyContentGraph(
    await resolveContentSource(config, application),
  );
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
  if (status.kind === "invalid") return { status: "invalid" };
  return {
    status: "valid",
    version: status.version,
    entryCount: status.entryCount,
  };
}

async function resolveContentSource(
  config: ResolvedRiebeckiteConfig,
  application: RiebeckiteApplication,
): Promise<ContentSource> {
  if (config.content.source) return config.content.source;
  const hostRoot = await resolveHonoxApplicationRoot(
    application.applicationRoot,
  );
  return new FileSystemContentSource(
    path.resolve(hostRoot, config.content.directory),
    config.content.exclude,
  );
}

function contentSourceName(config: ResolvedRiebeckiteConfig): string {
  return config.content.source ? "custom" : "filesystem";
}

function displayPath(value: string): string {
  return path.relative(process.cwd(), value) || ".";
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}
