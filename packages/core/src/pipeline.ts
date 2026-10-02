import rehypeFormat from "rehype-format";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Node } from "unist";
import type { VFile } from "vfile";
import { matter } from "vfile-matter";
import {
  type ContentDependencyTracker,
  createContentDependencyTracker,
  fingerprintContent,
} from "./content/content_dependency_tracker.js";
import {
  CONTENT_CACHE_SCHEMA_VERSION,
  computeContentCacheKey,
  computePipelineFingerprint,
  createPersistentContentCache,
  extractFrontmatter,
  isPersistentlyCacheable,
  type PersistentContentCache,
} from "./content/content_persistent_cache.js";
import type { ContentSource } from "./content/content_source.js";
import type { Observability } from "./observability.js";
import { noopObservability } from "./observability.js";
import type { PluginCache } from "./plugin/plugin_cache.js";
import {
  createPluginCache,
  createUnavailablePluginCache,
  resolvePluginCacheDirectory,
} from "./plugin/plugin_cache.js";
import { createUnavailableGeneratedOutputSink } from "./types/generated_output.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
import { resolvePlugins } from "./types/plugin.js";
import type {
  MarkdownEmbedFragment,
  MarkdownExecutionContext,
  MarkdownPipelineContext,
} from "./types/plugin_pipeline.js";
import type { PostContent, PostFrontmatter } from "./types/post_content.js";

export interface PipelineOptions {
  plugins?: RiebeckitePlugin[];
  observability?: Observability;
  config?: import("./types/resolved_riebeckite_config.js").ResolvedRiebeckiteConfig;
  contentSource?: ContentSource;
  isRoutable?: (slug: string) => boolean;
}

export class Pipeline {
  private pluginCaches = new Map<string, PluginCache>();
  private persistentCache: PersistentContentCache | null = null;
  private pipelineFingerprint: string | null = null;

  constructor(
    private contentIndex: Map<string, string>,
    private permalinks: ReadonlyMap<string, string>,
    private getMarkdownBySlug?: (slug: string) => Promise<string>,
    private options: PipelineOptions = {},
    private isBuildTime = false,
  ) {
    if (this.options.config && this.options.config.cache?.enabled !== false) {
      this.persistentCache = createPersistentContentCache({
        config: this.options.config,
        logger: this.options.observability?.logger,
        tracer: this.options.observability?.tracer,
      });
      this.pipelineFingerprint = computePipelineFingerprint(
        this.options.config,
      );
    }
  }

  async execute(
    markDownContent: string,
    context: MarkdownExecutionContext = {},
  ): Promise<PostContent> {
    return await this.executeWithEmbedState(
      markDownContent,
      context,
      0,
      new Set(context.sourceSlug ? [context.sourceSlug] : []),
      this.options.contentSource
        ? createContentDependencyTracker(this.options.contentSource)
        : null,
    );
  }

  private async executeWithEmbedState(
    markDownContent: string,
    context: MarkdownExecutionContext,
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    rootDependencyTracker: ContentDependencyTracker | null,
  ): Promise<PostContent> {
    const dependencyTracker = rootDependencyTracker;
    const effectiveContentSource = dependencyTracker
      ? dependencyTracker.contentSource
      : this.options.contentSource;

    if (
      embedDepth === 0 &&
      this.persistentCache &&
      this.pipelineFingerprint &&
      context.sourceSlug &&
      this.options.contentSource
    ) {
      const cacheable = isPersistentlyCacheable(
        context.sourceSlug,
        this.options.config,
      );
      if (cacheable.cacheable) {
        const frontmatter = extractFrontmatter(markDownContent);
        const cacheKey = computeContentCacheKey({
          slug: context.sourceSlug,
          source: markDownContent,
          frontmatter,
          pipelineFingerprint: this.pipelineFingerprint,
        });

        const cachedEntry = await this.persistentCache.get(cacheKey);
        if (cachedEntry) {
          const validationTracker = createContentDependencyTracker(
            this.options.contentSource,
          );
          let valid = true;
          for (const dep of cachedEntry.dependencies) {
            if (dep.kind === "content") {
              const content = await validationTracker.readContent(
                dep.id,
                async () => (await this.getMarkdownBySlug?.(dep.id)) ?? "",
              );
              if (fingerprintContent(content) !== dep.fingerprint) {
                valid = false;
                break;
              }
            } else if (dep.kind === "file") {
              const fileContent = await validationTracker.contentSource.read({
                path: dep.id,
              });
              if (fingerprintContent(fileContent) !== dep.fingerprint) {
                valid = false;
                break;
              }
            } else if (dep.kind === "link") {
              if (
                fingerprintContent(this.resolveLinkDependency(dep.id)) !==
                dep.fingerprint
              ) {
                valid = false;
                break;
              }
            }
          }
          if (valid) {
            this.options.observability?.tracer?.event(
              "persistentContentCache.hit",
              { key: cacheKey, slug: context.sourceSlug },
            );
            return {
              frontmatter: cachedEntry.value.frontmatter,
              html: cachedEntry.value.html,
            };
          }
        }
        this.options.observability?.tracer?.event(
          "persistentContentCache.miss",
          { key: cacheKey, slug: context.sourceSlug },
        );
      } else {
        this.options.observability?.tracer?.event(
          "persistentContentCache.bypass",
          { slug: context.sourceSlug, reason: cacheable.reason },
        );
      }
    }

    const processor = unified();
    const plugins = resolvePlugins(this.options.plugins);
    this.use(processor, remarkParse);
    this.use(processor, remarkDirective);
    this.use(processor, remarkFrontmatter, ["yaml", "toml"]);
    this.use(processor, function loadFrontmatter() {
      return (_tree: Node, file: VFile) => {
        matter(file);
      };
    });
    this.use(processor, remarkMath);
    this.use(processor, remarkGfm);

    const markdownPipelineContext: MarkdownPipelineContext = {
      sourceSlug: context.sourceSlug,
      contentIndex: this.contentIndex,
      resolvePermalink: (slug) => this.getPermalink(slug),
      isRoutable: this.options.isRoutable,
      renderNoteEmbed: this.createNoteEmbedRenderer(
        embedDepth,
        embedTrail,
        dependencyTracker,
      ),
      renderContent: this.createContentRenderer(effectiveContentSource),
      contentSource: effectiveContentSource,
    };

    for (const plugin of plugins) {
      for (const remarkPlugin of plugin.remarkPlugins ?? []) {
        this.use(processor, remarkPlugin);
      }
      plugin.extendMarkdownPipeline?.(
        {
          use: (pipelinePlugin, options) => {
            this.use(processor, pipelinePlugin, options);
          },
        },
        markdownPipelineContext,
      );
    }

    this.use(processor, normalizeMarkdownLinks, {
      ...markdownPipelineContext,
      recordLinkResolution: dependencyTracker
        ? (id, value) => dependencyTracker.recordLinkResolution(id, value)
        : undefined,
    });

    this.use(processor, remarkRehype, { allowDangerousHtml: true });
    this.use(processor, rehypeRaw);

    for (const plugin of plugins) {
      for (const rehypePlugin of plugin.rehypePlugins ?? []) {
        this.use(processor, rehypePlugin);
      }
      plugin.extendHtmlPipeline?.({
        use: (pipelinePlugin, options) => {
          this.use(processor, pipelinePlugin, options);
        },
      });
    }

    this.use(processor, rehypeSlug);
    this.use(processor, rehypeKatex, { output: "mathml", strict: false });
    this.use(processor, rehypeFormat);

    this.use(processor, rehypeStringify, { allowDangerousHtml: true });

    const file = await processor.process(markDownContent.trim());

    const result = {
      frontmatter: (file.data.matter || {}) as PostFrontmatter,
      html: String(file.value),
    };

    // Write to cache after successful processing, capturing dependencies from tracker
    if (
      embedDepth === 0 &&
      this.persistentCache &&
      this.pipelineFingerprint &&
      context.sourceSlug &&
      dependencyTracker
    ) {
      const cacheable = isPersistentlyCacheable(
        context.sourceSlug,
        this.options.config,
      );
      if (cacheable.cacheable) {
        const frontmatter = extractFrontmatter(markDownContent);
        const cacheKey = computeContentCacheKey({
          slug: context.sourceSlug,
          source: markDownContent,
          frontmatter,
          pipelineFingerprint: this.pipelineFingerprint,
        });

        const dependencies = dependencyTracker.dependencies();
        const entry = {
          schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
          key: cacheKey,
          dependencies,
          value: result,
        };
        await this.persistentCache.set(cacheKey, entry);
      }
    }

    return result;
  }

  private getPermalink(slug: string): string {
    const permalink = this.permalinks.get(slug);
    if (!permalink) {
      throw new Error(`Content public location was not resolved: ${slug}`);
    }
    return permalink;
  }

  private resolveLinkDependency(id: string): string {
    return resolveLinkDependencyValue(
      id,
      this.contentIndex,
      (slug) => this.permalinks.get(slug),
      this.options.isRoutable,
    );
  }

  private use(
    processor: ReturnType<typeof unified>,
    plugin: unknown,
    options?: unknown,
  ) {
    const register = processor.use.bind(processor) as (
      plugin: unknown,
      options?: unknown,
    ) => unknown;
    if (options === undefined) {
      register(plugin);
    } else {
      register(plugin, options);
    }
  }

  private createNoteEmbedRenderer(
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    dependencyTracker: ContentDependencyTracker | null,
  ): MarkdownPipelineContext["renderNoteEmbed"] {
    if (!this.getMarkdownBySlug || embedDepth >= 3) return undefined;

    return async (slug: string, fragment: MarkdownEmbedFragment | null) => {
      if (this.options.isRoutable && !this.options.isRoutable(slug)) {
        return null;
      }
      if (embedTrail.has(slug)) return null;

      const sourceMarkdown = await this.getMarkdownBySlug?.(slug);
      const markdown = sourceMarkdown
        ? selectEmbedMarkdownFragment(sourceMarkdown, fragment)
        : null;
      if (!markdown) return null;

      const nextEmbedTrail = new Set(embedTrail);
      nextEmbedTrail.add(slug);

      // Record every embed at any depth so transitive embed dependencies are
      // captured by the root cache entry.
      if (dependencyTracker) {
        await dependencyTracker.readContent(slug, async () => markdown);
      }

      const content = await this.executeWithEmbedState(
        markdown,
        { sourceSlug: slug },
        embedDepth + 1,
        nextEmbedTrail,
        dependencyTracker,
      );
      return content.html;
    };
  }

  private createContentRenderer(
    contentSource: ContentSource | undefined,
  ): MarkdownPipelineContext["renderContent"] {
    const renderers = resolvePlugins(this.options.plugins).flatMap((plugin) =>
      (plugin.renderers ?? []).map((renderer) => ({ plugin, renderer })),
    );
    if (renderers.length === 0) return undefined;

    return async (input) => {
      for (const { plugin, renderer } of renderers) {
        const observability = this.options.observability ?? noopObservability;
        const html = await observability.tracer.span(
          "plugin.render",
          {
            plugin: plugin.name,
            contentPath: input.path,
            target: input.kind,
          },
          () =>
            renderer.render({
              config: this.options.config,
              contentIndex: this.contentIndex,
              diagnostics: [],
              cache: this.cacheFor(plugin, observability),
              output: createUnavailableGeneratedOutputSink(),
              logger: observability.logger.child({ plugin: plugin.name }),
              tracer: observability.tracer,
              contentSource,
              ...input,
            }),
        );
        if (html) return html;
      }
      return null;
    };
  }

  private cacheFor(
    plugin: RiebeckitePlugin,
    observability: Observability,
  ): PluginCache {
    const cached = this.pluginCaches.get(plugin.name);
    if (cached) return cached;

    const cache = this.isBuildTime
      ? createPluginCache({
          pluginName: plugin.name,
          cacheVersion: plugin.cacheVersion,
          cacheDirectory: resolvePluginCacheDirectory(this.options.config),
          tracer: observability.tracer,
          logger: observability.logger.child({ plugin: plugin.name }),
        })
      : createUnavailablePluginCache();
    this.pluginCaches.set(plugin.name, cache);
    return cache;
  }
}

function selectEmbedMarkdownFragment(
  markdown: string,
  fragment: MarkdownEmbedFragment | null,
): string | null {
  if (!fragment) return markdown;
  if (fragment.kind === "block")
    return selectBlockFragment(markdown, fragment.value);
  return selectHeadingFragment(markdown, fragment.value);
}

function selectBlockFragment(markdown: string, blockId: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const blockIdRe = new RegExp(`(?:^|\\s)\\^${escapeRegExp(blockId)}\\s*$`);
  const line = lines.find((currentLine) => blockIdRe.test(currentLine));
  return line?.replace(blockIdRe, "").trimEnd() || null;
}

function normalizeMarkdownLinks(context: LinkNormalizationContext) {
  return (tree: Node) => {
    visitMarkdownLinkNodes(tree, (node) => {
      const normalizedUrl = normalizeMarkdownLinkUrl(node.url, context);
      if (normalizedUrl) node.url = normalizedUrl;
    });
  };
}

const LINK_INDEX_PREFIX = "index:";
const LINK_LOCATION_PREFIX = "location:";

type LinkNormalizationContext = MarkdownPipelineContext & {
  recordLinkResolution?: (id: string, value: string) => void;
};

function resolveLinkDependencyValue(
  id: string,
  contentIndex: ReadonlyMap<string, string>,
  lookupPermalink: (slug: string) => string | undefined,
  isRoutable: ((slug: string) => boolean) | undefined,
): string {
  if (id.startsWith(LINK_INDEX_PREFIX)) {
    return contentIndex.get(id.slice(LINK_INDEX_PREFIX.length)) ?? "";
  }
  if (id.startsWith(LINK_LOCATION_PREFIX)) {
    const slug = id.slice(LINK_LOCATION_PREFIX.length);
    const permalink = lookupPermalink(slug);
    if (permalink === undefined) return "";
    if (isRoutable && !isRoutable(slug)) return "";
    return permalink;
  }
  return "";
}

type MarkdownLinkNode = Node & {
  url?: unknown;
  children?: Node[];
};

function visitMarkdownLinkNodes(
  node: Node,
  visitor: (node: { url: string }) => void,
): void {
  const linkNode = node as MarkdownLinkNode;
  if (
    (node.type === "link" || node.type === "definition") &&
    typeof linkNode.url === "string"
  ) {
    visitor(linkNode as { url: string });
  }

  for (const child of linkNode.children ?? []) {
    visitMarkdownLinkNodes(child, visitor);
  }
}

function normalizeMarkdownLinkUrl(
  url: string,
  context: LinkNormalizationContext,
): string | null {
  if (!context.sourceSlug) return null;
  if (!isMarkdownContentLink(url)) return null;

  const [pathAndQuery, hash = ""] = splitOnce(url, "#");
  const [rawPath, query = ""] = splitOnce(pathAndQuery, "?");
  const decodedPath = decodeUriPath(rawPath);
  if (!decodedPath?.toLowerCase().endsWith(".md")) return null;

  const resolvedSlug = resolveRelativeMarkdownSlug(
    context.sourceSlug,
    decodedPath,
  );
  if (!resolvedSlug) return null;

  const indexedSlug = getExactContentSlug(context, resolvedSlug);
  if (!indexedSlug) return null;
  recordLinkResolution(context, LINK_LOCATION_PREFIX, indexedSlug);
  if (context.isRoutable && !context.isRoutable(indexedSlug)) return null;

  const suffix = `${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
  return `${context.resolvePermalink(indexedSlug)}${suffix}`;
}

function recordLinkResolution(
  context: LinkNormalizationContext,
  prefix: string,
  key: string,
): void {
  if (!context.recordLinkResolution) return;
  const value =
    prefix === LINK_INDEX_PREFIX
      ? (context.contentIndex.get(key) ?? "")
      : resolveLinkDependencyValue(
          `${prefix}${key}`,
          context.contentIndex,
          (slug) => {
            try {
              return context.resolvePermalink(slug);
            } catch {
              return undefined;
            }
          },
          context.isRoutable,
        );
  context.recordLinkResolution(`${prefix}${key}`, value);
}

function getExactContentSlug(
  context: LinkNormalizationContext,
  slug: string,
): string | null {
  try {
    context.resolvePermalink(slug);
    return slug;
  } catch {
    const indexKey = slug.toLowerCase();
    recordLinkResolution(context, LINK_INDEX_PREFIX, indexKey);
    return context.contentIndex.get(indexKey) ?? null;
  }
}

function isMarkdownContentLink(url: string): boolean {
  if (url.startsWith("#") || url.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  return true;
}

function resolveRelativeMarkdownSlug(
  sourceSlug: string,
  targetPath: string,
): string | null {
  const sourceDirectory = sourceSlug.includes("/")
    ? sourceSlug.slice(0, sourceSlug.lastIndexOf("/"))
    : "";
  const baseParts = targetPath.startsWith("/")
    ? []
    : sourceDirectory.split("/");
  const parts = [...baseParts, ...targetPath.replace(/^\/+/, "").split("/")];
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalizedParts.length === 0) return null;
      normalizedParts.pop();
      continue;
    }
    normalizedParts.push(part);
  }

  return normalizedParts.join("/").replace(/\.md$/i, "");
}

function decodeUriPath(path: string): string | null {
  try {
    return decodeURI(path);
  } catch {
    return null;
  }
}

function splitOnce(value: string, separator: string): [string, string?] {
  const index = value.indexOf(separator);
  if (index < 0) return [value];
  return [value.slice(0, index), value.slice(index + separator.length)];
}

function selectHeadingFragment(
  markdown: string,
  heading: string,
): string | null {
  const lines = markdown.split(/\r?\n/);
  const targetHeading = heading.trim().toLowerCase();
  const startIndex = lines.findIndex((line) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    return match?.[2]?.trim().toLowerCase() === targetHeading;
  });
  if (startIndex < 0) return null;

  const level = lines[startIndex]?.match(/^(#{1,6})\s+/)?.[1]?.length ?? 6;
  const endIndex = lines.findIndex((line, index) => {
    if (index <= startIndex) return false;
    const match = line.match(/^(#{1,6})\s+/);
    return match !== null && match[1].length <= level;
  });

  const selectedLines = lines.slice(
    startIndex,
    endIndex === -1 ? undefined : endIndex,
  );
  return selectedLines.join("\n").trim() || null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
