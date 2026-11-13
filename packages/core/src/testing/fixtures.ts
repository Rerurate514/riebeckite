import { createContentGraph } from "../content/content_graph.js";
import type { ResolvedPublishingState } from "../content/publishing.js";
import { noopObservability } from "../observability.js";
import { createUnavailablePluginCache } from "../plugin/plugin_cache.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import { createUnavailableGeneratedOutputSink } from "../types/generated_output.js";
import type {
  PluginContentLocationContext,
  PluginContext,
  PluginManifestContext,
} from "../types/plugin_context.js";
import type { PostFrontmatter } from "../types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import type { RiebeckiteConfig } from "../types/riebeckite_config.js";
import type { ResolvedTheme } from "../types/theme_config.js";

/**
 * Builders for the contract objects plugins receive at runtime. They exist so
 * tests construct complete, internally consistent objects instead of casting
 * partial literals.
 */

function defaultPublishingState(): ResolvedPublishingState {
  return { visibility: "public", routable: true, discoverable: true };
}

function defaultFrontmatter(): PostFrontmatter {
  return {};
}

export function createContentManifestEntry(
  overrides: Partial<ContentManifestEntry> = {},
): ContentManifestEntry {
  const {
    slug = "",
    permalink = "/",
    publicLocation,
    title = "",
    frontmatter = defaultFrontmatter(),
    publishing = defaultPublishingState(),
    html = "",
    tags = [],
    links = [],
    backlinks = [],
    assets = [],
    ...rest
  } = overrides;
  const location: ContentPublicLocation = publicLocation ?? { slug, permalink };
  return {
    slug,
    permalink,
    publicLocation: location,
    title,
    frontmatter,
    publishing,
    html,
    tags,
    links,
    backlinks,
    assets,
    ...rest,
  };
}

export function createContentManifest(
  overrides: Partial<ContentManifest> = {},
): ContentManifest {
  const {
    entries = [],
    publicEntries,
    discoverableEntries,
    bySlug,
    byContentId = new Map(),
    byAlias = new Map(),
    byPermalink = new Map(),
    byRoutablePermalink = new Map(),
    redirects = new Map(),
    publicRedirects = new Map(),
    byTag = new Map(),
    byAsset = new Map(),
    outgoingLinks = new Map(),
    incomingLinks = new Map(),
    contentIndex,
    contentIndexAmbiguities,
    graph,
    assets = [],
    clientEntries = [],
    diagnostics = [],
    generatedOutputs = [],
    folderLocations = new Map(),
    icons,
    pageRoutes = [],
    pagePaths = [],
    localization,
    ...rest
  } = overrides;
  const resolvedBySlug =
    bySlug ?? new Map(entries.map((entry) => [entry.slug, entry]));
  const resolvedPublicEntries =
    publicEntries ?? entries.filter((entry) => entry.publishing.routable);
  const resolvedDiscoverableEntries =
    discoverableEntries ??
    entries.filter((entry) => entry.publishing.discoverable);
  const resolvedContentIndex =
    contentIndex ??
    new Map(entries.map((entry) => [entry.slug.toLowerCase(), entry.slug]));
  return {
    localization,
    entries,
    publicEntries: resolvedPublicEntries,
    discoverableEntries: resolvedDiscoverableEntries,
    bySlug: resolvedBySlug,
    byContentId,
    byAlias,
    byPermalink,
    byRoutablePermalink,
    redirects,
    publicRedirects,
    byTag,
    byAsset,
    outgoingLinks,
    incomingLinks,
    contentIndex: resolvedContentIndex,
    contentIndexAmbiguities,
    graph:
      graph ??
      createContentGraph({
        entries,
        bySlug: resolvedBySlug,
        outgoingLinks,
        incomingLinks,
      }),
    assets,
    clientEntries,
    diagnostics,
    generatedOutputs,
    folderLocations,
    icons,
    pageRoutes,
    pagePaths,
    ...rest,
  };
}

export function createPluginContext(
  overrides: Partial<PluginContext> = {},
): PluginContext {
  const {
    config,
    isDevelopment,
    buildTime,
    contentIndex = new Map(),
    diagnostics = [],
    cache = createUnavailablePluginCache(),
    derived,
    output = createUnavailableGeneratedOutputSink(),
    logger = noopObservability.logger,
    tracer = noopObservability.tracer,
    contentSource,
    externalDependencies,
    ...rest
  } = overrides;
  return {
    config,
    isDevelopment,
    buildTime,
    contentIndex,
    diagnostics,
    cache,
    derived,
    output,
    logger,
    tracer,
    contentSource,
    externalDependencies,
    ...rest,
  };
}

export function createPluginContentLocationContext(
  overrides: Partial<PluginContentLocationContext> = {},
): PluginContentLocationContext {
  const { entries = [], ...rest } = overrides;
  return { ...createPluginContext(rest), entries };
}

export function createPluginManifestContext(
  overrides: Partial<PluginManifestContext> = {},
): PluginManifestContext {
  const { manifest, ...rest } = overrides;
  return {
    ...createPluginContext(rest),
    manifest: manifest ?? createContentManifest(),
  };
}

function defaultSite(): ResolvedRiebeckiteConfig["site"] {
  return {
    title: "Test Site",
    description: "",
    author: "",
    baseUrl: "/",
    locale: "en",
    twitterSite: "",
    defaultOgImage: "",
    feed: { title: "", description: "", language: "en" },
  };
}

function defaultTheme(): ResolvedTheme {
  return {
    name: "test-theme",
    colorMode: "light",
    layout: "article",
    styles: [],
    stylesheets: [],
    settings: { values: {}, attributes: {}, style: "" },
  };
}

export function createRiebeckiteConfig(
  overrides: Partial<RiebeckiteConfig> = {},
): RiebeckiteConfig {
  const {
    site = { title: "Test Site" },
    content,
    theme,
    plugins,
    cache,
    provenance,
    publication,
    spa,
    ...rest
  } = overrides;
  return {
    site,
    content,
    theme,
    plugins,
    cache,
    provenance,
    publication,
    spa,
    ...rest,
  };
}

export function createResolvedRiebeckiteConfig(
  overrides: Partial<ResolvedRiebeckiteConfig> = {},
): ResolvedRiebeckiteConfig {
  const {
    buildDirectory,
    outputDirectory,
    site = defaultSite(),
    content = {
      directory: "content",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme = defaultTheme(),
    plugins = [],
    pluginInventory,
    cache = { enabled: false, directory: ".riebeckite/cache" },
    provenance,
    publication,
    spa,
    ...rest
  } = overrides;
  return {
    buildDirectory,
    outputDirectory,
    site,
    content,
    theme,
    plugins,
    pluginInventory,
    cache,
    provenance,
    publication,
    spa,
    ...rest,
  };
}

export function createInvalid<T>(value: unknown): T {
  return value as T;
}
