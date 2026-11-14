import { contentQueryValue } from "../content/output_dependency.js";
import { createDerivedViewRegistry } from "../derived/derived_view.js";
import type { PipelineOptions } from "../pipeline.js";
import type { ExternalDependencySnapshot } from "../types/external_dependency.js";
import { GeneratedOutputRegistry } from "./generated_output_registry.js";
import { ManifestHookRunner } from "./manifest_hooks.js";
import type { PluginCache } from "./plugin_cache.js";
import { PluginPageResolver } from "./plugin_pages.js";
import {
  fingerprintDerivedValue,
  normalizeDerivedPath,
} from "./plugin_runtime_shared.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export function initializePluginRuntime(
  m: PluginRuntimeContext,
  pipelineOptions: PipelineOptions = {},
): void {
  m.pipelineOptions = pipelineOptions;
  m.buildLifecycle = null;
  m.disposed = false;
  m.diagnostics = [];
  m.pluginCaches = new Map<string, PluginCache>();
  m.contentIndex = new Map<string, string>();
  m.generatedOutputs = new GeneratedOutputRegistry();
  m.isBuildTime = false;
  m.resolvedPlugins = null;
  m.externalDependencies = new Map<string, ExternalDependencySnapshot>();
  m.externalDependencyFailures = [];
  m.externalDependenciesResolved = false;
  m.derivedFiles = new Map<string, string>();
  m.derivedManifest = null;
  m.derivedOutputLinks = new Map<string, Set<string>>();
  m.pageMarkdownRenderer = null;
  m.hookSequence = 0;
  m.hookExecutions = [];
  m.derivedViews = createDerivedViewRegistry({
    cache: () => m.derivedCache(),
    queryEntries: (pool) => {
      const manifest = m.derivedManifest;
      if (!manifest) {
        throw new Error(
          "Content queries are available only during generated output planning.",
        );
      }
      return pool === "routable"
        ? manifest.publicEntries
        : manifest.discoverableEntries;
    },
    dependencyFingerprint: (dependency) => {
      if (dependency.type === "content") {
        const target = m.contentIndex.get(dependency.id.toLowerCase());
        if (target === undefined) return undefined;
        const fingerprint = m.derivedFiles.get(
          normalizeDerivedPath(
            m.derivedManifest?.bySlug.get(target)?.sourcePath ?? `${target}.md`,
          ),
        );
        return fingerprint === undefined
          ? undefined
          : fingerprintDerivedValue({ target, fingerprint });
      }
      if (dependency.type === "external") {
        return m.externalDependencies.get(dependency.id)?.fingerprint;
      }
      if (dependency.type === "file") {
        return m.derivedFiles.get(normalizeDerivedPath(dependency.id));
      }
      if (dependency.type === "frontmatter") {
        const entry = m.derivedManifest?.bySlug.get(dependency.id);
        if (!entry || !dependency.property) return undefined;
        return fingerprintDerivedValue(
          contentQueryValue(entry, dependency.property),
        );
      }
      return undefined;
    },
  });
  m.pageResolver = new PluginPageResolver({
    plugins: () => m.plugins(),
    createContext: (contentIndex) => m.createContext(contentIndex),
    createPluginContext: (plugin, context) =>
      m.createPluginContext(plugin, context),
    renderMarkdown: async (markdown) => {
      if (!m.pageMarkdownRenderer) {
        throw new Error("Plugin page Markdown renderer is unavailable.");
      }
      return await m.pageMarkdownRenderer(markdown);
    },
  });
  m.manifestHooks = new ManifestHookRunner({
    plugins: () => m.plugins(),
    createContext: (contentIndex) => m.createContext(contentIndex),
    createPluginContext: (plugin, context) =>
      m.createPluginContext(plugin, context),
    generatedOutputCount: () => m.generatedOutputs.count(),
    diagnosticCount: () => m.diagnostics.length,
    recordExecution: (plugin, hook, status, durationMs) =>
      m.recordHookExecution(plugin, hook, status, durationMs),
  });
}
