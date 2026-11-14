import {
  computePipelineFingerprint,
  createPersistentContentCache,
} from "./content/content_persistent_cache.js";
import { fingerprintExternalValue } from "./content/external_fingerprint.js";
import { createDerivedViewRegistry } from "./derived/derived_view.js";
import type { PipelineContext } from "./pipeline_context.js";
import type { PipelineOptions } from "./pipeline_types.js";
import type { PluginCache } from "./plugin/plugin_cache.js";

export function initializePipeline(
  m: PipelineContext,
  contentIndex: Map<string, string>,
  permalinks: ReadonlyMap<string, string>,
  getMarkdownBySlug?: (slug: string) => Promise<string>,
  options: PipelineOptions = {},
  isBuildTime = false,
): void {
  m.contentIndex = contentIndex;
  m.permalinks = permalinks;
  m.getMarkdownBySlug = getMarkdownBySlug;
  m.options = options;
  m.isBuildTime = isBuildTime;
  m.pluginCaches = new Map<string, PluginCache>();
  m.derivedViews = createDerivedViewRegistry({
    cache: () => m.derivedCache(),
    dependencyFingerprint: (dependency) => {
      if (dependency.type !== "content") return undefined;
      const content = m.contentIndex.get(dependency.id);
      return content === undefined
        ? undefined
        : fingerprintExternalValue(content);
    },
  });
  m.persistentCache = null;
  m.pipelineFingerprint = null;
  m.resolvedPlugins = null;
  if (m.options.config && m.options.config.cache?.enabled !== false) {
    m.persistentCache = createPersistentContentCache({
      config: m.options.config,
      logger: m.options.observability?.logger,
      tracer: m.options.observability?.tracer,
    });
    m.pipelineFingerprint = computePipelineFingerprint(
      m.options.config,
      m.options.contentScopeFingerprint,
    );
  }
}
