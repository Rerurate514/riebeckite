import { stableStringify } from "../plugin/plugin_memo.js";
import type {
  ProcessedContentCacheApplicability,
  ProcessedContentCacheContext,
} from "../types/plugin.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import { hash } from "./content_cache_io.js";

export function isPersistentlyCacheable(
  slug: string,
  config: ResolvedRiebeckiteConfig,
  source?: string,
): { cacheable: boolean; reason?: string } {
  const context = source === undefined ? undefined : { slug, source };
  const unsafePlugin = config.plugins.find((plugin) => {
    if (plugin.enabled === false) return false;
    if (!canAffectProcessedContent(plugin)) return false;
    const contract = plugin.processedContentCache;
    if (!contract) return true;
    if (!context) return contract.dependencyMode === "unsafe";
    const applicability = getApplicability(contract.appliesToContent, context);
    if (applicability === "does-not-apply") return false;
    if (applicability === "unknown") return true;
    if (contract.dependencyMode === "unsafe") return true;
    return getContractDependencyFingerprint(contract, context) === undefined;
  });

  if (unsafePlugin) {
    if (unsafePlugin.processedContentCache?.dependencyMode === "unsafe") {
      return {
        cacheable: false,
        reason: `plugin ${unsafePlugin.name} explicitly marks processed content cache as unsafe and cannot prove safety for this content`,
      };
    }

    return {
      cacheable: false,
      reason: `plugin ${unsafePlugin.name} can affect processed content without a processedContentCache contract`,
    };
  }

  return { cacheable: true };
}

export function computeContentCacheFingerprint(
  slug: string,
  source: string,
  config: ResolvedRiebeckiteConfig,
): string {
  const context = { slug, source };
  const plugins = config.plugins
    .filter(
      (plugin) => plugin.enabled !== false && canAffectProcessedContent(plugin),
    )
    .map((plugin) => {
      const contract = plugin.processedContentCache;
      if (!contract) return { name: plugin.name, applicability: "unknown" };
      const applicability = getApplicability(
        contract.appliesToContent,
        context,
      );
      return {
        name: plugin.name,
        applicability,
        dependencyFingerprint:
          applicability === "applies"
            ? getContractDependencyFingerprint(contract, context)
            : undefined,
      };
    });
  return hash(stableStringify(plugins));
}

export function getApplicability(
  appliesToContent:
    | ((
        context: ProcessedContentCacheContext,
      ) => ProcessedContentCacheApplicability)
    | undefined,
  context: ProcessedContentCacheContext | undefined,
): ProcessedContentCacheApplicability {
  if (!context) return "unknown";
  if (!appliesToContent) return "applies";
  try {
    const applicability = appliesToContent(context);
    return applicability === "applies" ||
      applicability === "does-not-apply" ||
      applicability === "unknown"
      ? applicability
      : "unknown";
  } catch {
    return "unknown";
  }
}

export function getContractDependencyFingerprint(
  contract: NonNullable<
    ResolvedRiebeckiteConfig["plugins"][number]["processedContentCache"]
  >,
  context: ProcessedContentCacheContext | undefined,
): string | undefined {
  if (!context) return undefined;
  try {
    const content = contract.contentDependencyFingerprint?.(context);
    if (contract.contentDependencyFingerprint && content === undefined)
      return undefined;
    const environment = contract.environmentFingerprint?.();
    if (contract.environmentFingerprint && environment === undefined)
      return undefined;
    return hash(
      stableStringify({
        content: content ?? null,
        environment: environment ?? null,
      }),
    );
  } catch {
    return undefined;
  }
}

export function hasGlobalContentDependency(
  config: ResolvedRiebeckiteConfig,
): boolean {
  return config.plugins.some(
    (plugin) =>
      plugin.enabled !== false &&
      canAffectProcessedContent(plugin) &&
      plugin.processedContentCache?.dependencyMode === "global",
  );
}

export function requiresFullContentRegeneration(
  config: ResolvedRiebeckiteConfig,
): boolean {
  return config.plugins.some((plugin) => {
    if (plugin.enabled === false || !canAffectProcessedContent(plugin)) {
      return false;
    }
    const contract = plugin.processedContentCache;
    return (
      !contract ||
      (contract.dependencyMode === "unsafe" && !contract.appliesToContent)
    );
  });
}

export function canAffectProcessedContent(
  plugin: ResolvedRiebeckiteConfig["plugins"][number],
): boolean {
  return Boolean(
    plugin.remarkPlugins?.length ||
      plugin.rehypePlugins?.length ||
      plugin.preprocessMarkdown ||
      plugin.extendMarkdownPipeline ||
      plugin.extendHtmlPipeline ||
      plugin.renderers?.length ||
      plugin.markdownComponents?.length ||
      plugin.hastTransforms?.length ||
      plugin.contentFormats?.length ||
      plugin.onContentLoaded ||
      plugin.onPostParsed ||
      plugin.onPostProcessed,
  );
}
