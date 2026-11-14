import { noopObservability, type Observability } from "../observability.js";
import type { ManifestHookMetrics } from "../plugin/plugin_runtime.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { PostFrontmatter } from "../types/post_content.js";
import { mapConcurrent } from "../utils/concurrency.js";
import { attachErrorPath } from "../utils/error.js";
import { isImagePath, normalizeContentPath } from "./attachment.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  CONTENT_PROCESSING_CONCURRENCY,
  type CompletedContentBuildSnapshot,
  readFrontmatter,
} from "./content_manager_shared.js";
import { reuseManifestEntry } from "./content_manifest_reuse.js";
import {
  computeContentCacheFingerprint,
  isPersistentlyCacheable,
} from "./content_persistent_cache.js";
import { resolvePublishingState } from "./publishing.js";

export function reuseManifestEntryImpl(
  m: ContentManagerContext,
  slug: string,
  sourcePath: string,
  source: string,
  plan: ContentBuildPlan,
): ContentManifestEntry | null {
  const reused = reuseManifestEntry({
    slug,
    sourcePath,
    plan,
    pipelineFingerprint: m.getPipelineFingerprint(),
    getContentCacheFingerprint: () =>
      m.getProcessedContentCacheFingerprint(slug, source),
  });
  if (!reused) return null;
  m.reusedContentCount += 1;
  m.processedContentCacheFingerprints.set(slug, reused.contentCacheFingerprint);
  m.observability().tracer.event("content.reuse", { slug });
  return reused.entry;
}

export function getProcessedContentCacheFingerprintImpl(
  m: ContentManagerContext,
  slug: string,
  source: string,
): string | undefined {
  const config = m.pipelineOptions.config;
  if (!config || !isPersistentlyCacheable(slug, config, source).cacheable) {
    m.processedContentCacheFingerprints.set(slug, undefined);
    return undefined;
  }
  const fingerprint = computeContentCacheFingerprint(slug, source, config);
  m.processedContentCacheFingerprints.set(slug, fingerprint);
  return fingerprint;
}

export function isRoutableImpl(
  m: ContentManagerContext,
  slug: string,
): boolean {
  if (!m.routableSlugs) {
    throw new Error(`Publishing state was not resolved: ${slug}`);
  }
  return m.routableSlugs.has(slug);
}

export async function ensureRoutableSlugsImpl(
  m: ContentManagerContext,
): Promise<Set<string>> {
  if (m.routableSlugs) return m.routableSlugs;
  if (m.routableSlugsPromise) return await m.routableSlugsPromise;

  m.routableSlugsPromise = m.resolveRoutableSlugs();
  try {
    m.routableSlugs = await m.routableSlugsPromise;
    return m.routableSlugs;
  } finally {
    m.routableSlugsPromise = null;
  }
}

export async function resolveRoutableSlugsImpl(
  m: ContentManagerContext,
): Promise<Set<string>> {
  const strategy = m.publishStrategy();
  const posts = await m.getAllPosts();
  const routableSlugs = new Set<string>();
  await mapConcurrent(posts, CONTENT_PROCESSING_CONCURRENCY, async (post) => {
    const sourcePath = await m.getContentPath(post.slug);
    const markdown = await m.getPost(post.slug);
    let frontmatter: PostFrontmatter;
    try {
      frontmatter = readFrontmatter(markdown);
    } catch (error) {
      throw attachErrorPath(error, sourcePath);
    }
    const publishing = resolvePublishingState(frontmatter, {
      strategy,
      buildTime: m.publishingBuildTime,
    });
    if (publishing.routable) routableSlugs.add(post.slug);
  });
  return routableSlugs;
}

export async function emitPublicImageAssetsImpl(
  m: ContentManagerContext,
  manifest: ContentManifest,
): Promise<void> {
  const replacedPaths = new Set(
    manifest.publicEntries
      .flatMap((entry) => entry.assets)
      .filter(
        (asset) =>
          asset.sourcePath !== undefined && asset.path === asset.sourcePath,
      )
      .map((asset) => normalizeContentPath(asset.path)),
  );
  const imagePaths = new Set(
    manifest.publicEntries.flatMap((entry) =>
      entry.assets
        .filter((asset) => asset.sourcePath === undefined)
        .map((asset) => normalizeContentPath(asset.path))
        .filter((path) => isImagePath(path) && !replacedPaths.has(path)),
    ),
  );
  const entriesByPath = new Map(
    (await m.source.scan()).map((entry) => [entry.path, entry]),
  );
  for (const path of imagePaths) {
    const entry = entriesByPath.get(path);
    if (entry) m.pluginRuntime.emitCoreAsset(path, await m.source.read(entry));
  }
}

export async function attachFinalOutputArtifactsImpl(
  m: ContentManagerContext,
  buildId: string,
  fingerprints: Readonly<Record<string, string>>,
  cacheHits: ReadonlySet<string>,
): Promise<void> {
  if (m.provenance?.buildId !== buildId) return;
  await m.buildCoordinator.attachFinalOutputArtifacts(
    buildId,
    fingerprints,
    cacheHits,
  );
}

export function recordFinalHtmlDiagnosticsImpl(
  m: ContentManagerContext,
  diagnostics: readonly Diagnostic[],
): void {
  m.finalHtmlDiagnostics.splice(
    0,
    m.finalHtmlDiagnostics.length,
    ...diagnostics,
  );
}

export function observabilityImpl(m: ContentManagerContext): Observability {
  return m.pipelineOptions.observability ?? noopObservability;
}

export function getProcessedContentCountImpl(m: ContentManagerContext): number {
  return m.processedContentCount;
}

export function getReusedContentCountImpl(m: ContentManagerContext): number {
  return m.reusedContentCount;
}

export function getManifestHookMetricsImpl(
  m: ContentManagerContext,
): ManifestHookMetrics {
  return m.pluginRuntime.getManifestHookMetrics();
}

export function getCompletedBuildSnapshotImpl(
  m: ContentManagerContext,
): CompletedContentBuildSnapshot | undefined {
  return m.completedBuildSnapshot ?? undefined;
}

export function getProvenanceImpl(
  m: ContentManagerContext,
): BuildProvenance | undefined {
  return m.provenance;
}
