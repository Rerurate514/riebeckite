import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";
import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import type {
  ContentAsset,
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import type { PluginContext } from "../types/plugin";
import { resolvePlugins } from "../types/plugin";
import type { PostContent } from "../types/post_content";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config";
import { isAttachmentPath, isImagePath } from "./attachment";

const WIKILINK_PATTERN =
  /(!)?\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const TAG_PATTERN = /(^|[\s([{"'])#([\p{L}\p{N}_\-/]+)/gu;

export type Backlink = {
  slug: string;
};

export class ContentManager {
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private pipeline: Pipeline | null = null;
  private buildStarted = false;
  private diagnostics: PluginContext["diagnostics"] = [];

  constructor(
    private contentDirectory: string,
    private exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {}

  async getAllPosts(): Promise<{ slug: string }[]> {
    const files = await fs.readdir(this.contentDirectory, { recursive: true });

    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const normalizedPath = f.replace(/\\/g, "/");
        const slug = normalizedPath.replace(/\.md$/, "");
        return { slug };
      })
      .filter((post) => !isExcluded(this.exclude, post.slug));
  }

  async getPost(slug: string): Promise<string> {
    const filePath = path.resolve(this.contentDirectory, `${slug}.md`);
    const relative = path.relative(this.contentDirectory, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Invalid slug: ${slug}`);
    }
    return await fs.readFile(filePath, "utf-8");
  }

  async getContentIndex(): Promise<Map<string, string>> {
    if (this.contentIndex) return this.contentIndex;

    const files = await fs.readdir(this.contentDirectory, { recursive: true });
    const index = new Map<string, string>();

    for (const f of files) {
      const normalizedPath = f.replace(/\\/g, "/");
      if (isExcluded(this.exclude, normalizedPath)) continue;
      const ext = normalizedPath.split(".").pop()?.toLowerCase() ?? "";

      let value: string;
      let parts: string[];

      if (ext === "md") {
        value = normalizedPath.replace(/\.md$/, "");
        parts = value.split("/");
      } else {
        value = normalizedPath;
        parts = normalizedPath.split("/");
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const rawSuffix = parts.slice(i).join("/");
        const key = rawSuffix.toLowerCase();

        if (!index.has(key)) {
          index.set(key, value);
        }

        if (ext !== "md") {
          const rawStemSuffix = rawSuffix.replace(/\.[^/.]+$/, "");
          const stemKey = rawStemSuffix.toLowerCase();
          if (!index.has(stemKey)) index.set(stemKey, value);
        }
      }

      if (ext === "md") {
        const markdown = await fs.readFile(
          path.resolve(this.contentDirectory, normalizedPath),
          "utf-8",
        );
        for (const alias of extractFrontmatterAliases(markdown)) {
          const key = alias.toLowerCase();
          if (!index.has(key)) index.set(key, value);
        }
      }
    }

    this.contentIndex = index;
    return index;
  }

  async getProcessedContent(slug: string): Promise<PostContent> {
    const cached = this.contentCache.get(slug);
    if (cached) return cached;

    const [contentIndex, rawPost] = await Promise.all([
      this.getContentIndex(),
      this.getPost(slug),
    ]);
    await this.startBuild(contentIndex);
    await this.runContentLoaded(slug, rawPost, contentIndex);
    this.pipeline ??= new Pipeline(
      contentIndex,
      (slug) => this.getPost(slug),
      this.pipelineOptions,
    );
    const content = await this.pipeline.execute(rawPost, 0, new Set([slug]));
    await this.runPostHook(
      "onPostParsed",
      slug,
      rawPost,
      content,
      contentIndex,
    );
    await this.runPostHook(
      "onPostProcessed",
      slug,
      rawPost,
      content,
      contentIndex,
    );
    this.contentCache.set(slug, content);
    return content;
  }

  async getManifest(): Promise<ContentManifest> {
    if (this.manifest) return this.manifest;

    const [posts, contentIndex] = await Promise.all([
      this.getAllPosts(),
      this.getContentIndex(),
    ]);

    const entries = await Promise.all(
      posts.map(async (post) => {
        const [rawPost, processed] = await Promise.all([
          this.getPost(post.slug),
          this.getProcessedContent(post.slug),
        ]);

        return createManifestEntry(post.slug, rawPost, processed, contentIndex);
      }),
    );

    await this.runGraphHook(entries, contentIndex);
    this.manifest = buildManifest(entries, contentIndex);
    await this.runManifestCreated(this.manifest, contentIndex);
    this.manifest.assets = collectPluginAssets(
      this.pipelineOptions,
      this.createPluginContext(contentIndex),
    );
    this.manifest.diagnostics = [
      ...this.diagnostics,
      ...(await collectPluginDiagnostics(
        this.pipelineOptions,
        this.createPluginContext(contentIndex),
      )),
    ];
    await this.runBuildEnd(this.manifest, contentIndex);
    return this.manifest;
  }

  async getBacklinks(targetSlug: string): Promise<Backlink[]> {
    const manifest = await this.getManifest();
    return (manifest.incomingLinks.get(targetSlug) ?? []).map((slug) => ({
      slug,
    }));
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    const manifest = await this.getManifest();
    return manifest.diagnostics;
  }

  private createPluginContext(
    contentIndex: Map<string, string>,
  ): PluginContext {
    return {
      config: this.pipelineOptions.config,
      contentIndex,
      diagnostics: this.diagnostics,
    };
  }

  private async startBuild(contentIndex: Map<string, string>) {
    if (this.buildStarted) return;

    this.buildStarted = true;
    const context = this.createPluginContext(contentIndex);
    await runPluginHook(
      this.pipelineOptions,
      (plugin) => plugin.onBuildStart,
      context,
    );
    await runPluginHook(
      this.pipelineOptions,
      (plugin) => plugin.onConfigResolved,
      context,
    );
  }

  private async runContentLoaded(
    slug: string,
    markdown: string,
    contentIndex: Map<string, string>,
  ) {
    await runPluginHook(
      this.pipelineOptions,
      (plugin) => plugin.onContentLoaded,
      { ...this.createPluginContext(contentIndex), slug, markdown },
    );
  }

  private async runPostHook(
    hookName: "onPostParsed" | "onPostProcessed",
    slug: string,
    markdown: string,
    content: PostContent,
    contentIndex: Map<string, string>,
  ) {
    await runPluginHook(this.pipelineOptions, (plugin) => plugin[hookName], {
      ...this.createPluginContext(contentIndex),
      slug,
      markdown,
      content,
    });
  }

  private async runGraphHook(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ) {
    await runPluginHook(
      this.pipelineOptions,
      (plugin) => plugin.extendContentGraph,
      { ...this.createPluginContext(contentIndex), entries },
    );
  }

  private async runManifestCreated(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ) {
    await runPluginHook(
      this.pipelineOptions,
      (plugin) => plugin.onManifestCreated,
      { ...this.createPluginContext(contentIndex), manifest },
    );
  }

  private async runBuildEnd(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ) {
    await runPluginHook(this.pipelineOptions, (plugin) => plugin.onBuildEnd, {
      ...this.createPluginContext(contentIndex),
      manifest,
    });
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
  }
}

async function runPluginHook<TContext>(
  pipelineOptions: PipelineOptions,
  hook: (
    plugin: NonNullable<PipelineOptions["plugins"]>[number],
  ) => ((context: TContext) => void | Promise<void>) | undefined,
  context: TContext,
) {
  for (const plugin of resolvePlugins(pipelineOptions.plugins)) {
    await hook(plugin)?.(context);
  }
}

function createManifestEntry(
  slug: string,
  markdown: string,
  processed: PostContent,
  contentIndex: Map<string, string>,
): ContentManifestEntry {
  const links = extractContentLinks(markdown, contentIndex);
  const assets = links
    .filter(
      (link): link is ContentLink & { slug: string } =>
        (link.kind === "image" || link.kind === "attachment") &&
        link.slug !== null,
    )
    .map((link) => ({ path: link.slug }));

  return {
    slug,
    title: getManifestTitle(slug, processed.frontmatter.title),
    frontmatter: processed.frontmatter,
    html: processed.html,
    tags: uniqueStrings([
      ...normalizeFrontmatterTags(processed.frontmatter.tags),
      ...extractContentTags(markdown),
    ]),
    links,
    backlinks: [],
    assets: uniqueAssets(assets),
  };
}

function buildManifest(
  entries: ContentManifestEntry[],
  contentIndex: Map<string, string>,
): ContentManifest {
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const byTag = new Map<string, ContentManifestEntry[]>();
  const byAsset = new Map<string, ContentManifestEntry[]>();
  const outgoingLinks = new Map<string, ContentLink[]>();
  const incomingLinks = new Map<string, string[]>();

  for (const entry of entries) {
    outgoingLinks.set(entry.slug, entry.links);

    for (const tag of entry.tags) appendToMap(byTag, tag, entry);
    for (const asset of entry.assets) appendToMap(byAsset, asset.path, entry);

    for (const link of entry.links) {
      if (link.kind !== "note" || !link.slug || link.slug === entry.slug)
        continue;
      appendUniqueToMap(incomingLinks, link.slug, entry.slug);
    }
  }

  for (const entry of entries) {
    entry.backlinks = incomingLinks.get(entry.slug) ?? [];
  }

  return {
    entries,
    bySlug,
    byTag,
    byAsset,
    outgoingLinks,
    incomingLinks,
    contentIndex,
    assets: [],
    diagnostics: [],
  };
}

function collectPluginAssets(
  pipelineOptions: PipelineOptions,
  context: PluginContext,
) {
  return resolvePlugins(pipelineOptions.plugins).flatMap((plugin) =>
    [...(plugin.assets ?? []), ...(plugin.injectAssets?.(context) ?? [])]
      .map((asset) => ({
        ...asset,
        path: asset.moduleSpecifier ?? asset.path,
        pluginName: asset.pluginName || plugin.name,
      }))
      .filter((asset): asset is typeof asset & { path: string } =>
        Boolean(asset.path),
      ),
  );
}

async function collectPluginDiagnostics(
  pipelineOptions: PipelineOptions,
  context: PluginContext,
): Promise<Diagnostic[]> {
  const results: Diagnostic[] = [];
  for (const plugin of resolvePlugins(pipelineOptions.plugins)) {
    const diagnostics = await plugin.addDiagnostics?.(context);
    for (const diagnostic of diagnostics ?? []) {
      results.push({
        ...diagnostic,
        pluginName: diagnostic.pluginName || plugin.name,
      });
    }
  }
  return results;
}

function extractContentLinks(
  markdown: string,
  contentIndex: Map<string, string>,
): ContentLink[] {
  WIKILINK_PATTERN.lastIndex = 0;
  const links: ContentLink[] = [];

  for (
    let match = WIKILINK_PATTERN.exec(markdown);
    match !== null;
    match = WIKILINK_PATTERN.exec(markdown)
  ) {
    const rawTarget = match[2]?.trim();
    if (!rawTarget) continue;

    const resolved = contentIndex.get(rawTarget.toLowerCase()) ?? null;
    links.push({
      raw: rawTarget,
      slug: resolved,
      kind: resolved ? linkKind(resolved) : "unresolved",
      embed: match[1] === "!",
    });
  }

  return links;
}

function extractContentTags(markdown: string): string[] {
  TAG_PATTERN.lastIndex = 0;
  const tags: string[] = [];

  for (
    let match = TAG_PATTERN.exec(markdown);
    match !== null;
    match = TAG_PATTERN.exec(markdown)
  ) {
    const tag = normalizeTag(match[2] ?? "");
    if (tag) tags.push(tag);
  }

  return uniqueStrings(tags);
}

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/[/-]+$/, "");
  if (!cleaned) return null;

  const isPurelyNumeric = /^[\p{N}/\-_]+$/u.test(cleaned);
  if (isPurelyNumeric) return null;

  return cleaned;
}

function linkKind(value: string): "note" | "image" | "attachment" {
  if (isImagePath(value)) return "image";
  if (isAttachmentPath(value)) return "attachment";
  return "note";
}

function normalizeFrontmatterTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.flatMap((tag) => normalizeFrontmatterTags(tag));
  }
  if (typeof tags !== "string") return [];
  return tags
    .split(/[\s,]+/)
    .map((tag) => normalizeTag(tag.replace(/^#/, "")))
    .filter((tag): tag is string => tag !== null);
}

function extractFrontmatterAliases(markdown: string): string[] {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter?.[1]) return [];

  const aliases: string[] = [];
  const lines = frontmatter[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const inlineMatch = line.match(/^aliases?:\s*(.+)$/i);
    if (inlineMatch?.[1]) {
      aliases.push(...parseYamlScalarOrList(inlineMatch[1]));
      continue;
    }

    if (/^aliases?:\s*$/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        const itemMatch = lines[j]?.match(/^\s*-\s*(.+)$/);
        if (!itemMatch?.[1]) break;
        aliases.push(stripYamlQuotes(itemMatch[1]));
      }
    }
  }
  return uniqueStrings(aliases.map((alias) => alias.trim()).filter(Boolean));
}

function parseYamlScalarOrList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map(stripYamlQuotes).filter(Boolean);
  }
  return [stripYamlQuotes(trimmed)];
}

function stripYamlQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function getManifestTitle(slug: string, title: unknown): string {
  return typeof title === "string" && title.trim() ? title : slug;
}

function uniqueAssets(assets: ContentAsset[]): ContentAsset[] {
  return Array.from(
    new Map(assets.map((asset) => [asset.path, asset])).values(),
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function appendUniqueToMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  if (!values.includes(value)) values.push(value);
  map.set(key, values);
}
