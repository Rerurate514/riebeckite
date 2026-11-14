import type { ContentPublicLocation } from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PublishStrategy } from "../types/publish_strategy.js";
import { mapConcurrent } from "../utils/concurrency.js";
import {
  isAttachmentPath,
  isImagePath,
  normalizeContentPath,
} from "./attachment.js";
import type { ContentGraph } from "./content_graph.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  type Backlink,
  CONTENT_PROCESSING_CONCURRENCY,
  type ContentInspection,
  type PublicAssetReferences,
} from "./content_manager_shared.js";
import {
  extractMarkdownAssetUrls,
  resolveContentAssetUrl,
} from "./markdown_image.js";

export async function getPublicAssetReferencesImpl(
  m: ContentManagerContext,
): Promise<PublicAssetReferences> {
  const manifest = await m.getRouteManifest();
  const images = new Set<string>();
  const attachments = new Set<string>();
  let nextPublishAt: number | null = null;
  const now = Date.now();

  for (const entry of manifest.entries) {
    const publishAt = entry.publishing.publishAt?.getTime();
    if (publishAt !== undefined && publishAt > now) {
      nextPublishAt =
        nextPublishAt === null ? publishAt : Math.min(nextPublishAt, publishAt);
    }
  }

  for (const entry of manifest.publicEntries) {
    for (const asset of entry.assets) {
      const path = normalizeContentPath(asset.sourcePath ?? asset.path);
      if (isImagePath(path)) images.add(path);
      else if (isAttachmentPath(path)) attachments.add(path);
    }
  }

  await mapConcurrent(
    manifest.publicEntries,
    CONTENT_PROCESSING_CONCURRENCY,
    async (entry) => {
      const markdown = await m.getPost(entry.slug);
      if (
        !/<img\b|<a\b[^>]*href=["'][^"']+\.(?:png|jpe?g|gif|svg|webp|avif|ico)(?:[?#"']|$)/i.test(
          markdown,
        )
      )
        return;
      for (const url of extractMarkdownAssetUrls(markdown)) {
        const image = resolveContentAssetUrl(url, entry.slug);
        if (image) images.add(image.path);
      }
    },
  );

  return { images, attachments, nextPublishAt };
}

export async function getBacklinksImpl(
  m: ContentManagerContext,
  targetSlug: string,
): Promise<Backlink[]> {
  const graph = await m.getContentGraph();
  return graph.incomingSlugs(targetSlug).map((slug) => ({
    slug,
  }));
}

export async function getContentGraphImpl(
  m: ContentManagerContext,
): Promise<ContentGraph> {
  const manifest = await m.getRequestManifest();
  return manifest.graph;
}

export async function getDiagnosticsImpl(
  m: ContentManagerContext,
): Promise<Diagnostic[]> {
  const manifest = await m.getManifest();
  return manifest.diagnostics;
}

export async function getContentLocationsImpl(
  m: ContentManagerContext,
): Promise<ReadonlyMap<string, ContentPublicLocation>> {
  return await m.locationResolver.getLocations();
}

export async function getPagePathsImpl(
  m: ContentManagerContext,
): Promise<readonly string[]> {
  const [manifest, contentIndex] = await Promise.all([
    m.getManifest(),
    m.getContentIndex(),
  ]);
  return await m.pluginRuntime.getPagePaths(manifest, contentIndex);
}

export async function resolvePageImpl(
  m: ContentManagerContext,
  pathname: string,
): Promise<ResolvedPluginPage | null> {
  if (
    m.pipelineOptions.isDevelopment &&
    m.pluginRuntime.canUseDevelopmentRouteManifest()
  ) {
    const [manifest, contentIndex] = await Promise.all([
      m.getRouteManifest(),
      m.getContentIndex(),
    ]);
    const page = await m.pluginRuntime.resolveRoute(
      pathname,
      manifest,
      contentIndex,
    );
    if (page !== undefined) return page;
  }
  const [manifest, contentIndex] = await Promise.all([
    m.getManifest({ incremental: false }),
    m.getContentIndex(),
  ]);
  return await m.pluginRuntime.resolvePage(pathname, manifest, contentIndex);
}

export async function inspectImpl(
  m: ContentManagerContext,
): Promise<ContentInspection> {
  const [entries, contentIndex] = await Promise.all([
    m.entryReader.getEntries(),
    m.getContentIndex(),
    // Location resolution is the generic phase where plugins can inspect all
    // content entries (including their frontmatter) and register diagnostics.
    // Run it for inspect/doctor as well as for a full manifest build.
    m.getContentLocations(),
  ]);
  const diagnostics = await m.pluginRuntime.collectDiagnostics(contentIndex);

  return { entries, contentIndex, diagnostics };
}

export async function disposeImpl(m: ContentManagerContext): Promise<void> {
  m.entryReader.clearReadCache();
  m.pipeline?.dispose();
  if (m.contentIndex) await m.pluginRuntime.dispose(m.contentIndex);
}

export function publishStrategyImpl(m: ContentManagerContext): PublishStrategy {
  return (
    m.pipelineOptions.config?.content.filters.publishStrategy ?? "explicit"
  );
}
