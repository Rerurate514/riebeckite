import type { ContentManifest } from "../types/content_manifest.js";
import type { PostFrontmatter } from "../types/post_content.js";
import { mapConcurrent } from "../utils/concurrency.js";
import { attachErrorPath } from "../utils/error.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  CONTENT_PROCESSING_CONCURRENCY,
  type ContentBuildOptions,
  readFrontmatter,
} from "./content_manager_shared.js";
import { resolvePublishingState } from "./publishing.js";

export async function getManifestImpl(
  m: ContentManagerContext,
  options?: ContentBuildOptions,
): Promise<ContentManifest> {
  m.requestBuildStateCommit(options);
  if (m.manifest) return m.manifest;
  if (m.manifestPromise) return await m.manifestPromise;

  m.manifestPromise = m.buildManifest(options);
  try {
    return await m.manifestPromise;
  } catch (error) {
    m.manifestPromise = null;
    throw error;
  }
}

export async function getRouteManifestImpl(
  m: ContentManagerContext,
): Promise<ContentManifest> {
  if (m.routeManifest) return m.routeManifest;
  if (m.routeManifestPromise) return await m.routeManifestPromise;

  m.routeManifestPromise = m.buildRouteManifest();
  try {
    return await m.routeManifestPromise;
  } catch (error) {
    m.routeManifestPromise = null;
    throw error;
  }
}

export async function getRequestManifestImpl(
  m: ContentManagerContext,
): Promise<ContentManifest> {
  return m.pipelineOptions.isDevelopment &&
    m.pluginRuntime.canUseDevelopmentRouteManifest()
    ? await m.getRouteManifest()
    : await m.getManifest();
}

export async function buildRouteManifestImpl(
  m: ContentManagerContext,
): Promise<ContentManifest> {
  return await m
    .observability()
    .tracer.span("content.route-manifest", {}, async () => {
      const [sourceEntries, contentIndex, locations] = await Promise.all([
        m.scan(),
        m.getContentIndex(),
        m.getContentLocations(),
      ]);
      const entriesByPath = new Map(
        sourceEntries.map((entry) => [entry.path, entry]),
      );
      const posts = sourceEntries.flatMap((entry) => {
        const slug = m.formats.toSlug(entry.path);
        return slug === undefined ? [] : [{ slug, path: entry.path }];
      });
      const entries = await mapConcurrent(
        posts,
        CONTENT_PROCESSING_CONCURRENCY,
        async (post) => {
          const markdown = await m.getPost(post.slug);
          const location = locations.get(post.slug);
          if (!location) {
            throw new Error(
              `Content public location was not resolved: ${post.slug}`,
            );
          }
          let frontmatter: PostFrontmatter;
          try {
            frontmatter = readFrontmatter(markdown);
          } catch (error) {
            throw attachErrorPath(error, post.path);
          }
          const publishing = resolvePublishingState(frontmatter, {
            strategy: m.publishStrategy(),
            buildTime: m.publishingBuildTime,
          });
          if (publishing.routable) {
            m.routableSlugs ??= new Set();
            m.routableSlugs.add(post.slug);
          }
          return m.manifestAssembler.createEntry(
            post.slug,
            markdown,
            { frontmatter, html: "" },
            contentIndex,
            location,
            publishing,
            entriesByPath.get(post.path)?.metadata,
            m.contentIndexAmbiguities,
            post.path,
          );
        },
      );
      await m.pluginRuntime.runDevelopmentRouteGraphHook(entries, contentIndex);
      const manifest = m.manifestAssembler.build(
        entries,
        contentIndex,
        m.contentIndexAmbiguities,
      );
      m.locationResolver.populateRedirects(manifest, locations);
      m.manifestAssembler.applyPublicView(
        manifest,
        m.publishStrategy(),
        m.publishingBuildTime,
      );
      await m.pluginRuntime.runDevelopmentRouteManifestHook(
        manifest,
        contentIndex,
      );
      m.routeManifest = manifest;
      return manifest;
    });
}

export async function buildManifestImpl(
  m: ContentManagerContext,
  options?: ContentBuildOptions,
): Promise<ContentManifest> {
  if (m.manifest) return m.manifest;

  m.enableBuildTime();
  m.pipelineOptions.traceRecorder?.begin();
  const startedAt = Date.now();

  const config = m.pipelineOptions.config;
  const plan = await m.getBuildPlan(options);
  const locations = await m.getContentLocations();
  if (config) {
    m.pipelineFingerprint = m.computePipelineFingerprint(locations);
  }

  return await m
    .observability()
    .tracer.span("content.manifest", {}, async () => {
      const { contentIndex, entries } = await m.collectManifestEntries(
        plan,
        locations,
      );
      const { manifest, cacheManifestEntries } = await m.assembleManifest(
        entries,
        contentIndex,
        locations,
        plan,
      );
      const outputChangeSet = await m.finalizeManifestOutputs(
        manifest,
        contentIndex,
        plan,
      );
      await m.recordCompletedBuild(
        manifest,
        plan,
        cacheManifestEntries,
        startedAt,
        outputChangeSet,
      );
      return manifest;
    });
}
