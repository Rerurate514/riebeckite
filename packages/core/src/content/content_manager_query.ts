import type { PostContent } from "../types/post_content.js";
import { attachErrorPath } from "../utils/error.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import type { ContentPostReference } from "./content_manager_shared.js";
import type { ContentSourceEntry } from "./content_source.js";

export async function getAllPostsImpl(
  m: ContentManagerContext,
): Promise<ContentPostReference[]> {
  return [...(await m.getContentPaths()).keys()].map((slug) => ({ slug }));
}

export async function scanImpl(
  m: ContentManagerContext,
): Promise<readonly ContentSourceEntry[]> {
  return await m.entryReader.getEntries();
}

export async function getPostImpl(
  m: ContentManagerContext,
  slug: string,
): Promise<string> {
  return await m.entryReader.readText(await m.getContentPath(slug));
}

export async function getContentPathsImpl(
  m: ContentManagerContext,
): Promise<Map<string, string[]>> {
  const entries = await m.scan();
  if (m.contentPathIndex?.entries !== entries) {
    const bySlug = new Map<string, string[]>();
    for (const entry of entries) {
      const slug = m.formats.toSlug(entry.path);
      if (slug === undefined) continue;
      const paths = bySlug.get(slug);
      if (paths) paths.push(entry.path);
      else bySlug.set(slug, [entry.path]);
    }
    m.contentPathIndex = { entries, bySlug };
  }
  return m.contentPathIndex.bySlug;
}

export async function getContentPathImpl(
  m: ContentManagerContext,
  slug: string,
): Promise<string> {
  const entries = (await m.getContentPaths()).get(slug) ?? [];
  if (entries.length === 0)
    throw new Error(`Content entry was not found: ${slug}`);
  if (entries.length > 1) {
    throw new Error(
      `Content slug collision for "${slug}": ${entries.join(", ")}`,
    );
  }
  return entries[0];
}

export async function getContentIndexImpl(
  m: ContentManagerContext,
  plan?: ContentBuildPlan,
): Promise<Map<string, string>> {
  if (m.contentIndex) return m.contentIndex;
  if (!plan && m.contentIndexPromise)
    return (await m.contentIndexPromise).index;

  if (plan) {
    m.contentIndex = plan.currentContentIndex;
    m.contentIndexAmbiguities = plan.currentContentIndexAmbiguities;
    return m.contentIndex;
  }

  const promise = m
    .observability()
    .tracer.span(
      "content.index",
      {},
      async () =>
        await m.contentIndexBuilder.build(
          await m.entryReader.getEntries(),
          (entry) => m.entryReader.read(entry),
        ),
    );
  if (!plan) m.contentIndexPromise = promise;
  try {
    const built = await promise;
    m.contentIndex = built.index;
    m.contentIndexAmbiguities = built.ambiguities;
    return m.contentIndex;
  } finally {
    if (!plan) m.contentIndexPromise = null;
  }
}

export async function getProcessedContentImpl(
  m: ContentManagerContext,
  slug: string,
): Promise<PostContent> {
  const cached = m.contentCache.get(slug);
  if (cached) return cached;

  return await m.observability().tracer.span(
    "content.process",
    {
      contentPath: await m.getContentPath(slug),
    },
    async () => {
      try {
        return await m.processContent(slug);
      } catch (error) {
        throw attachErrorPath(error, await m.getContentPath(slug));
      }
    },
  );
}

export async function processContentImpl(
  m: ContentManagerContext,
  slug: string,
): Promise<PostContent> {
  const startedAt = performance.now();
  const tracer = m.observability().tracer;
  const [contentIndex, rawPost, sourcePath] = await tracer.span(
    "content.process.inputs",
    {},
    async () =>
      await Promise.all([
        m.getContentIndex(),
        m.getPost(slug),
        m.getContentPath(slug),
      ]),
  );
  await tracer.span("content.process.cache-fingerprint", {}, () => {
    m.getProcessedContentCacheFingerprint(slug, rawPost);
  });

  await tracer.span("content.process.build-start", {}, () =>
    m.pluginRuntime.startBuild(contentIndex),
  );
  await tracer.span("content.process.content-loaded", {}, () =>
    m.pluginRuntime.runContentLoaded(slug, rawPost, contentIndex),
  );

  const content = await tracer.span(
    "content.process.pipeline",
    {},
    async () => {
      const format = m.formats.get(sourcePath);
      const processMarkdown = async (source: string) =>
        await (await m.getPipeline()).execute(source, {
          sourceSlug: slug,
        });
      const processed = format?.process
        ? await format.process({
            slug,
            sourcePath,
            source: rawPost,
            processMarkdown,
          })
        : await processMarkdown(rawPost);
      return { ...processed, sourcePath };
    },
  );
  m.processedContentCount += 1;
  if (m.processedContentCount % 100 === 0) {
    m.observability().tracer.event("content.process.sample", {
      processed: m.processedContentCount,
    });
  }

  await tracer.span("content.process.post-parsed", {}, () =>
    m.pluginRuntime.runPostHook(
      "onPostParsed",
      slug,
      rawPost,
      content,
      contentIndex,
    ),
  );
  await tracer.span("content.process.post-processed", {}, () =>
    m.pluginRuntime.runPostHook(
      "onPostProcessed",
      slug,
      rawPost,
      content,
      contentIndex,
    ),
  );

  m.contentCache.set(slug, content);
  m.processedContentDurations.set(slug, performance.now() - startedAt);
  return content;
}

export async function getContentDependenciesImpl(
  m: ContentManagerContext,
): Promise<ReadonlyMap<string, readonly string[]>> {
  const entries = await m.entryReader.getEntries();
  const paths = entries.map((entry) => entry.path);
  const dependencies = new Map<string, readonly string[]>();
  for (const entry of entries) {
    const format = m.formats.get(entry.path);
    if (!format?.dependencies) continue;
    const resolved = await format.dependencies({
      sourcePath: entry.path,
      source: await m.entryReader.read(entry),
      paths,
    });
    if (resolved.length > 0) {
      dependencies.set(
        entry.path,
        resolved.map((path) => path.replaceAll("\\", "/")),
      );
    }
  }
  return dependencies;
}
