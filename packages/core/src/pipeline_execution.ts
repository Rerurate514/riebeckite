import rehypeFormat from "rehype-format";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Node } from "unist";
import type { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { ContentDependencyTracker } from "./content/content_dependency_tracker.js";
import {
  CONTENT_CACHE_SCHEMA_VERSION,
  computeContentCacheKey,
  extractFrontmatter,
  isPersistentlyCacheable,
} from "./content/content_persistent_cache.js";
import {
  normalizeMarkdownImages,
  resolveContentAssetUrl,
} from "./content/markdown_image.js";
import { normalizeMarkdownLinks } from "./markdown_links.js";
import { markdownSanitizeSchema } from "./markdown_sanitize_schema.js";
import { noopObservability } from "./observability.js";
import type { PipelineContext } from "./pipeline_context.js";
import {
  dedupeFootnoteClobberPrefix,
  sanitizeMarkdownObjects,
  sanitizeMarkdownStyles,
  wrapMarkdownTables,
} from "./pipeline_helpers.js";
import { renderMarkdownComponents } from "./plugin_component_markdown.js";
import { renderHastTransforms } from "./plugin_hast_transform.js";
import type {
  MarkdownExecutionContext,
  MarkdownPipelineContext,
} from "./types/plugin_pipeline.js";
import type { PostContent, PostFrontmatter } from "./types/post_content.js";
export async function executeWithEmbedStateImpl(
  m: PipelineContext,
  markDownContent: string,
  context: MarkdownExecutionContext,
  embedDepth: number,
  embedTrail: ReadonlySet<string>,
  rootDependencyTracker: ContentDependencyTracker | null,
): Promise<PostContent> {
  const dependencyTracker = rootDependencyTracker;
  const effectiveContentSource = dependencyTracker
    ? dependencyTracker.contentSource
    : m.options.contentSource;

  const sourceSlug = context.sourceSlug;
  if (
    embedDepth === 0 &&
    m.persistentCache &&
    m.pipelineFingerprint &&
    sourceSlug &&
    m.options.contentSource &&
    m.options.config
  ) {
    const persistentCache = m.persistentCache;
    const cacheable = isPersistentlyCacheable(
      sourceSlug,
      m.options.config,
      markDownContent,
    );
    if (cacheable.cacheable) {
      const frontmatter = extractFrontmatter(markDownContent);
      const cacheKey = computeContentCacheKey({
        slug: sourceSlug,
        source: markDownContent,
        frontmatter,
        pipelineFingerprint: m.contentPipelineFingerprint(
          sourceSlug,
          markDownContent,
        ),
      });

      const lookup = await (
        m.options.observability ?? noopObservability
      ).tracer.span("persistentContentCache.lookup", {}, () =>
        persistentCache.lookup(cacheKey),
      );
      if (lookup.status === "hit") {
        const invalidDependency = await (
          m.options.observability ?? noopObservability
        ).tracer.span(
          "persistentContentCache.validation",
          { dependencyCount: lookup.entry.dependencies.length },
          () => m.findInvalidDependency(lookup.entry.dependencies),
        );
        if (!invalidDependency) {
          m.reportContentDependencies(sourceSlug, lookup.entry.dependencies);
          m.options.observability?.tracer?.event("persistentContentCache.hit", {
            key: cacheKey,
            slug: sourceSlug,
          });
          m.options.onPersistentContentCacheResult?.("hit");
          return {
            frontmatter: lookup.entry.value.frontmatter,
            html: lookup.entry.value.html,
          };
        }
        m.options.observability?.tracer?.event("persistentContentCache.miss", {
          key: cacheKey,
          slug: sourceSlug,
          reason: "dependency-changed",
          dependencyKind: invalidDependency.kind,
          dependencyId: invalidDependency.id,
        });
        m.options.onPersistentContentCacheResult?.("miss");
      } else {
        m.options.observability?.tracer?.event("persistentContentCache.miss", {
          key: cacheKey,
          slug: sourceSlug,
          reason: lookup.reason,
        });
        m.options.onPersistentContentCacheResult?.("miss");
      }
    } else {
      m.options.observability?.tracer?.event("persistentContentCache.bypass", {
        slug: sourceSlug,
        ...(cacheable.reason ? { reason: cacheable.reason } : {}),
      });
      m.options.onPersistentContentCacheResult?.("bypass");
    }
  }

  const processor = unified();
  const plugins = m.resolvePlugins();
  const markdown = plugins.reduce(
    (value, plugin) => plugin.preprocessMarkdown?.(value) ?? value,
    markDownContent,
  );
  m.use(processor, remarkParse);
  m.use(processor, remarkFrontmatter, ["yaml", "toml"]);
  m.use(processor, function loadFrontmatter() {
    return (_tree: Node, file: VFile) => {
      matter(file);
    };
  });
  m.use(processor, remarkMath);
  m.use(processor, remarkGfm);

  const markdownPipelineContext: MarkdownPipelineContext = {
    sourceSlug: context.sourceSlug,
    contentIndex: m.contentIndex,
    resolvePermalink: (slug) => m.getPermalink(slug),
    isRoutable: m.options.isRoutable,
    renderNoteEmbed: m.createNoteEmbedRenderer(
      embedDepth,
      embedTrail,
      dependencyTracker,
      context.sourceSlug,
    ),
    renderContent: m.createContentRenderer(effectiveContentSource),
    contentSource: effectiveContentSource,
  };

  for (const plugin of plugins) {
    for (const remarkPlugin of plugin.remarkPlugins ?? []) {
      m.use(processor, remarkPlugin);
    }
    plugin.extendMarkdownPipeline?.(
      {
        use: (pipelinePlugin, options) => {
          m.use(processor, pipelinePlugin, options);
        },
      },
      markdownPipelineContext,
    );
  }

  const componentContext = {
    sourceSlug: context.sourceSlug,
    resolveAssetUrl: (input: string) =>
      context.sourceSlug
        ? resolveContentAssetUrl(input, context.sourceSlug)
        : null,
  };
  const markdownComponents = plugins.flatMap(
    (plugin) => plugin.markdownComponents ?? [],
  );
  if (markdownComponents.length > 0) {
    m.use(processor, () =>
      renderMarkdownComponents(markdownComponents, componentContext),
    );
  }

  m.use(processor, normalizeMarkdownLinks, {
    ...markdownPipelineContext,
    recordLinkResolution: dependencyTracker
      ? (id: string, value: string) =>
          dependencyTracker.recordLinkResolution(id, value)
      : undefined,
  });
  if (context.sourceSlug) {
    m.use(processor, normalizeMarkdownImages(context.sourceSlug));
  }

  m.use(processor, remarkRehype, { allowDangerousHtml: true });
  m.use(processor, rehypeRaw);
  m.use(processor, dedupeFootnoteClobberPrefix);
  m.use(processor, rehypeSanitize, markdownSanitizeSchema);
  m.use(processor, sanitizeMarkdownStyles);
  m.use(processor, sanitizeMarkdownObjects);

  for (const plugin of plugins) {
    for (const rehypePlugin of plugin.rehypePlugins ?? []) {
      m.use(processor, rehypePlugin);
    }
    plugin.extendHtmlPipeline?.({
      use: (pipelinePlugin, options) => {
        m.use(processor, pipelinePlugin, options);
      },
    });
  }

  const hastTransforms = plugins.flatMap(
    (plugin) => plugin.hastTransforms ?? [],
  );
  if (hastTransforms.length > 0) {
    m.use(processor, () =>
      renderHastTransforms(hastTransforms, componentContext),
    );
  }

  m.use(processor, wrapMarkdownTables);
  m.use(processor, rehypeKatex, { output: "mathml", strict: false });
  m.use(processor, rehypeFormat);
  m.use(processor, rehypeSlug);

  m.use(processor, rehypeStringify, { allowDangerousHtml: true });

  const file = await (m.options.observability ?? noopObservability).tracer.span(
    "content.markdown",
    { embedded: embedDepth > 0 },
    async () => await processor.process(markdown.trim()),
  );

  const result = {
    frontmatter: (file.data.matter || {}) as PostFrontmatter,
    html: String(file.value),
  };

  if (embedDepth === 0 && sourceSlug && dependencyTracker) {
    m.recordNoteLinkDependencies(
      markDownContent,
      dependencyTracker,
      sourceSlug,
    );
  }

  if (sourceSlug && dependencyTracker) {
    m.reportContentDependencies(sourceSlug, dependencyTracker.dependencies());
  }

  if (
    embedDepth === 0 &&
    m.persistentCache &&
    m.pipelineFingerprint &&
    sourceSlug &&
    dependencyTracker &&
    m.options.config
  ) {
    const cacheable = isPersistentlyCacheable(
      sourceSlug,
      m.options.config,
      markDownContent,
    );
    if (cacheable.cacheable) {
      const frontmatter = extractFrontmatter(markDownContent);
      const cacheKey = computeContentCacheKey({
        slug: sourceSlug,
        source: markDownContent,
        frontmatter,
        pipelineFingerprint: m.contentPipelineFingerprint(
          sourceSlug,
          markDownContent,
        ),
      });

      const dependencies = dependencyTracker.dependencies();
      const entry = {
        schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
        key: cacheKey,
        dependencies,
        value: result,
      };
      await m.persistentCache.set(cacheKey, entry);
    }
  }

  return result;
}
