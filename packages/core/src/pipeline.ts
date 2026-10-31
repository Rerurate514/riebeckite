import rehypeFormat from "rehype-format";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
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
  type CachedContentDependency,
  type ContentDependencyTracker,
  createContentDependencyTracker,
  fingerprintContent,
  LINK_INDEX_PREFIX,
  LINK_LOCATION_PREFIX,
} from "./content/content_dependency_tracker.js";
import { extractContentLinks } from "./content/content_links.js";
import {
  CONTENT_CACHE_SCHEMA_VERSION,
  computeContentCacheFingerprint,
  computeContentCacheKey,
  computePipelineFingerprint,
  createPersistentContentCache,
  extractFrontmatter,
  isPersistentlyCacheable,
  type PersistentContentCache,
} from "./content/content_persistent_cache.js";
import type { ContentSource } from "./content/content_source.js";
import { fingerprintExternalValue } from "./content/external_fingerprint.js";
import { normalizeMarkdownImages } from "./content/markdown_image.js";
import { createDerivedViewRegistry } from "./derived/derived_view.js";
import { selectEmbedMarkdownFragment } from "./markdown_fragments.js";
import {
  normalizeMarkdownLinks,
  resolveLinkDependencyValue,
} from "./markdown_links.js";
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

const markdownSanitizeSchema: Parameters<typeof rehypeSanitize>[0] = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "aside",
    "button",
    "figcaption",
    "figure",
    "object",
    "option",
    "output",
    "mark",
    "select",
    "svg",
    "g",
    "path",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "rect",
    "title",
    "desc",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "math",
    "semantics",
    "mrow",
    "msup",
    "mi",
    "mn",
    "mo",
    "mfrac",
    "msqrt",
    "mroot",
    "mtext",
    "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter(
        (attribute) =>
          attribute !== "className" &&
          (!Array.isArray(attribute) || attribute[0] !== "className"),
      ),
      "className",
      "download",
    ],
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "data*",
      "role",
      "ariaControls",
      "ariaDescribedBy",
      "ariaExpanded",
      "ariaHidden",
      "ariaLabel",
      "ariaLabelledBy",
      "ariaSelected",
      "style",
      "tabIndex",
      "tabindex",
    ],
    button: ["type", "disabled"],
    input: ["type", "value", "min", "max", "step", "placeholder", "checked"],
    object: ["data", "type"],
    option: ["value", "selected"],
    svg: ["xmlns", "viewBox", "width", "height", "role", "focusable"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    rect: ["x", "y", "width", "height", "rx", "ry"],
    polyline: ["points"],
    polygon: ["points"],
    path: ["d", "pathLength"],
    g: ["clipPath", "mask"],
    linearGradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "x1",
      "y1",
      "x2",
      "y2",
    ],
    radialGradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "cx",
      "cy",
      "r",
      "fx",
      "fy",
    ],
    stop: ["offset", "stopColor", "stopOpacity"],
    math: ["xmlns"],
    annotation: ["encoding"],
  },
};

const safeMarkdownStyle =
  /^(?:--shiki-(?:light|dark):#[\da-f]{3,8};?)+$|^height:\d+(?:\.\d+)?px$|^--rb-(?:qr-size:\d+(?:\.\d+)?px|rich-embed-aspect:\d+(?:\.\d+)?)$/i;

function sanitizeMarkdownStyles() {
  return (tree: Node) => {
    removeUnsafeMarkdownStyles(tree as HtmlNode);
  };
}

const footnoteClobberPrefix = /^user-content-((?:fn|fnref|footnote-label).*)$/;

function dedupeFootnoteClobberPrefix() {
  return (tree: Node) => {
    removeFootnoteClobberPrefix(tree as HtmlNode);
  };
}

function removeFootnoteClobberPrefix(node: HtmlNode): void {
  const properties = node.properties;
  if (properties) {
    for (const property of ["id", "name", "ariaDescribedBy"] as const) {
      const value = properties[property];
      if (typeof value !== "string") continue;
      const match = footnoteClobberPrefix.exec(value);
      if (match) properties[property] = match[1];
    }
  }
  for (const child of node.children ?? []) {
    removeFootnoteClobberPrefix(child as HtmlNode);
  }
}

function removeUnsafeMarkdownStyles(node: HtmlNode): void {
  if (
    typeof node.properties?.style === "string" &&
    !safeMarkdownStyle.test(node.properties.style)
  ) {
    delete node.properties.style;
  }
  for (const child of node.children ?? []) {
    removeUnsafeMarkdownStyles(child as HtmlNode);
  }
}

export interface PipelineOptions {
  plugins?: RiebeckitePlugin[];
  isDevelopment?: boolean;
  observability?: Observability;
  traceRecorder?: import("./observability.js").BuildTraceRecorder;
  config?: import("./types/resolved_riebeckite_config.js").ResolvedRiebeckiteConfig;
  contentSource?: ContentSource;
  isRoutable?: (slug: string) => boolean;
  onContentDependencies?(
    slug: string,
    dependencies: readonly CachedContentDependency[],
  ): void;
  onPersistentContentCacheResult?(result: "hit" | "miss" | "bypass"): void;
  contentScopeFingerprint?: string;
}

type HtmlNode = Node & {
  children?: Node[];
  properties?: Record<string, unknown>;
  tagName?: string;
};

function isPluginTable(node: HtmlNode): boolean {
  const className = node.properties?.className;
  const names = Array.isArray(className) ? className : [className];
  return names.some(
    (name) =>
      typeof name === "string" &&
      (name.startsWith("rb-") || name.startsWith("rr-")),
  );
}

function wrapMarkdownTables() {
  return (tree: Node) => {
    wrapTableChildren(tree as HtmlNode);
  };
}

function wrapTableChildren(parent: HtmlNode): void {
  if (!parent.children) return;
  parent.children = parent.children.map((child) => {
    const node = child as HtmlNode;
    if (
      node.type === "element" &&
      node.tagName === "table" &&
      !isPluginTable(node)
    ) {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["rb-table-scroll"] },
        children: [child],
      } as Node;
    }
    wrapTableChildren(node);
    return child;
  });
}

export class Pipeline {
  private pluginCaches = new Map<string, PluginCache>();
  private readonly derivedViews = createDerivedViewRegistry({
    cache: () => this.derivedCache(),
    dependencyFingerprint: (dependency) => {
      if (dependency.type !== "content") return undefined;
      const content = this.contentIndex.get(dependency.id);
      return content === undefined
        ? undefined
        : fingerprintExternalValue(content);
    },
  });
  private persistentCache: PersistentContentCache | null = null;
  private pipelineFingerprint: string | null = null;
  private resolvedPlugins: RiebeckitePlugin[] | null = null;

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
        this.options.contentScopeFingerprint,
      );
    }
  }

  async execute(
    markDownContent: string,
    context: MarkdownExecutionContext = {},
  ): Promise<PostContent> {
    const dependencyTracker =
      this.options.contentSource &&
      (this.persistentCache || this.options.onContentDependencies)
        ? createContentDependencyTracker(this.options.contentSource)
        : null;
    return await this.executeWithEmbedState(
      markDownContent,
      context,
      0,
      new Set(context.sourceSlug ? [context.sourceSlug] : []),
      dependencyTracker,
    );
  }

  dispose(): void {
    this.derivedViews.dispose();
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

    const sourceSlug = context.sourceSlug;
    if (
      embedDepth === 0 &&
      this.persistentCache &&
      this.pipelineFingerprint &&
      sourceSlug &&
      this.options.contentSource &&
      this.options.config
    ) {
      const persistentCache = this.persistentCache;
      const cacheable = isPersistentlyCacheable(
        sourceSlug,
        this.options.config,
        markDownContent,
      );
      if (cacheable.cacheable) {
        const frontmatter = extractFrontmatter(markDownContent);
        const cacheKey = computeContentCacheKey({
          slug: sourceSlug,
          source: markDownContent,
          frontmatter,
          pipelineFingerprint: this.contentPipelineFingerprint(
            sourceSlug,
            markDownContent,
          ),
        });

        const lookup = await (
          this.options.observability ?? noopObservability
        ).tracer.span("persistentContentCache.lookup", {}, () =>
          persistentCache.lookup(cacheKey),
        );
        if (lookup.status === "hit") {
          const invalidDependency = await (
            this.options.observability ?? noopObservability
          ).tracer.span(
            "persistentContentCache.validation",
            { dependencyCount: lookup.entry.dependencies.length },
            () => this.findInvalidDependency(lookup.entry.dependencies),
          );
          if (!invalidDependency) {
            this.reportContentDependencies(
              sourceSlug,
              lookup.entry.dependencies,
            );
            this.options.observability?.tracer?.event(
              "persistentContentCache.hit",
              { key: cacheKey, slug: sourceSlug },
            );
            this.options.onPersistentContentCacheResult?.("hit");
            return {
              frontmatter: lookup.entry.value.frontmatter,
              html: lookup.entry.value.html,
            };
          }
          this.options.observability?.tracer?.event(
            "persistentContentCache.miss",
            {
              key: cacheKey,
              slug: sourceSlug,
              reason: "dependency-changed",
              dependencyKind: invalidDependency.kind,
              dependencyId: invalidDependency.id,
            },
          );
          this.options.onPersistentContentCacheResult?.("miss");
        } else {
          this.options.observability?.tracer?.event(
            "persistentContentCache.miss",
            {
              key: cacheKey,
              slug: sourceSlug,
              reason: lookup.reason,
            },
          );
          this.options.onPersistentContentCacheResult?.("miss");
        }
      } else {
        this.options.observability?.tracer?.event(
          "persistentContentCache.bypass",
          {
            slug: sourceSlug,
            ...(cacheable.reason ? { reason: cacheable.reason } : {}),
          },
        );
        this.options.onPersistentContentCacheResult?.("bypass");
      }
    }

    const processor = unified();
    const plugins = this.resolvePlugins();
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
        ? (id: string, value: string) =>
            dependencyTracker.recordLinkResolution(id, value)
        : undefined,
    });
    if (context.sourceSlug) {
      this.use(processor, normalizeMarkdownImages(context.sourceSlug));
    }

    this.use(processor, remarkRehype, { allowDangerousHtml: true });
    this.use(processor, rehypeRaw);
    this.use(processor, dedupeFootnoteClobberPrefix);
    this.use(processor, rehypeSanitize, markdownSanitizeSchema);
    this.use(processor, sanitizeMarkdownStyles);

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

    this.use(processor, wrapMarkdownTables);
    this.use(processor, rehypeKatex, { output: "mathml", strict: false });
    this.use(processor, rehypeFormat);
    this.use(processor, rehypeSlug);

    this.use(processor, rehypeStringify, { allowDangerousHtml: true });

    const file = await (
      this.options.observability ?? noopObservability
    ).tracer.span(
      "content.markdown",
      { embedded: embedDepth > 0 },
      async () => await processor.process(markDownContent.trim()),
    );

    const result = {
      frontmatter: (file.data.matter || {}) as PostFrontmatter,
      html: String(file.value),
    };

    if (embedDepth === 0 && sourceSlug && dependencyTracker) {
      this.recordNoteLinkDependencies(markDownContent, dependencyTracker);
    }

    if (sourceSlug && dependencyTracker) {
      this.reportContentDependencies(
        sourceSlug,
        dependencyTracker.dependencies(),
      );
    }

    if (
      embedDepth === 0 &&
      this.persistentCache &&
      this.pipelineFingerprint &&
      sourceSlug &&
      dependencyTracker &&
      this.options.config
    ) {
      const cacheable = isPersistentlyCacheable(
        sourceSlug,
        this.options.config,
        markDownContent,
      );
      if (cacheable.cacheable) {
        const frontmatter = extractFrontmatter(markDownContent);
        const cacheKey = computeContentCacheKey({
          slug: sourceSlug,
          source: markDownContent,
          frontmatter,
          pipelineFingerprint: this.contentPipelineFingerprint(
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
        await this.persistentCache.set(cacheKey, entry);
      }
    }

    return result;
  }

  private reportContentDependencies(
    slug: string,
    dependencies: readonly CachedContentDependency[],
  ): void {
    this.options.onContentDependencies?.(slug, dependencies);
  }

  private contentPipelineFingerprint(slug: string, source: string): string {
    const config = this.options.config;
    if (!config || !this.pipelineFingerprint) return "";
    return `${this.pipelineFingerprint}:${computeContentCacheFingerprint(slug, source, config)}`;
  }

  private async findInvalidDependency(
    dependencies: readonly CachedContentDependency[],
  ): Promise<CachedContentDependency | null> {
    const contentSource = this.options.contentSource;
    if (!contentSource) return null;
    const validationTracker = createContentDependencyTracker(contentSource);
    for (const dep of dependencies) {
      if (dep.kind === "content") {
        const content = await validationTracker.readContent(
          dep.id,
          async () => (await this.getMarkdownBySlug?.(dep.id)) ?? "",
        );
        if (fingerprintContent(content) !== dep.fingerprint) return dep;
      } else if (dep.kind === "file") {
        const fileContent = await validationTracker.contentSource.read({
          path: dep.id,
        });
        if (fingerprintContent(fileContent) !== dep.fingerprint) return dep;
      } else if (dep.kind === "link") {
        if (
          fingerprintContent(this.resolveLinkDependency(dep.id)) !==
          dep.fingerprint
        ) {
          return dep;
        }
      }
    }
    return null;
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

  private recordNoteLinkDependencies(
    markdown: string,
    dependencyTracker: ContentDependencyTracker,
  ): void {
    for (const link of extractContentLinks(markdown, this.contentIndex)) {
      if (link.slug !== null && link.kind === "note") {
        const id = `${LINK_LOCATION_PREFIX}${link.slug}`;
        dependencyTracker.recordLinkResolution(
          id,
          this.resolveLinkDependency(id),
        );
        continue;
      }
      if (link.kind === "unresolved") {
        const id = `${LINK_INDEX_PREFIX}${link.raw.toLowerCase()}`;
        dependencyTracker.recordLinkResolution(
          id,
          this.resolveLinkDependency(id),
        );
      }
    }
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

  private resolvePlugins(): RiebeckitePlugin[] {
    if (this.resolvedPlugins === null) {
      this.resolvedPlugins = resolvePlugins(this.options.plugins);
      assertUniqueDerivedViewIds(this.resolvedPlugins);
      for (const plugin of this.resolvedPlugins) {
        for (const view of plugin.derivedViews ?? []) {
          this.derivedViews.register(view);
        }
      }
    }
    return this.resolvedPlugins;
  }

  private createContentRenderer(
    contentSource: ContentSource | undefined,
  ): MarkdownPipelineContext["renderContent"] {
    const renderers = this.resolvePlugins().flatMap((plugin) =>
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
              derived: this.derivedViews,
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

  private derivedCache(): PluginCache {
    if (!this.isBuildTime) return createUnavailablePluginCache();
    const observability = this.options.observability ?? noopObservability;
    return createPluginCache({
      pluginName: "riebeckite-derived-data",
      cacheVersion: "1",
      cacheDirectory: resolvePluginCacheDirectory(this.options.config),
      tracer: observability.tracer,
      logger: observability.logger.child({
        plugin: "riebeckite-derived-data",
      }),
    });
  }
}

function assertUniqueDerivedViewIds(
  plugins: readonly RiebeckitePlugin[],
): void {
  const owners = new Map<string, string>();
  for (const plugin of plugins) {
    for (const view of plugin.derivedViews ?? []) {
      const previous = owners.get(view.id);
      if (previous) {
        throw new Error(
          `Derived View "${view.id}" is declared by both "${previous}" and "${plugin.name}".`,
        );
      }
      owners.set(view.id, plugin.name);
    }
  }
}
