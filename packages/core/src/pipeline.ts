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
import type { Plugin } from "unified";
import { unified } from "unified";
import type { Node } from "unist";
import type { VFile } from "vfile";
import { matter } from "vfile-matter";
import { remarkObsidianCallout } from "./plugins/remark_obsidian_callout";
import { remarkObsidianTag } from "./plugins/remark_obsidian_tag";
import { remarkObsidianWikilink } from "./plugins/remark_obsidian_wikilink";
import type { PostContent, PostFrontmatter } from "./types/post_content";

export type PipelinePlugin = Plugin<[], Node, Node>;

export type PipelineOptions = {
  rehypePlugins?: PipelinePlugin[];
};

export class Pipeline {
  constructor(
    private contentIndex: Map<string, string>,
    private getMarkdownBySlug?: (slug: string) => Promise<string>,
    private options: PipelineOptions = {},
  ) {}

  async execute(
    markDownContent: string,
    embedDepth = 0,
    embedTrail = new Set<string>(),
  ): Promise<PostContent> {
    const processor = unified();
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
    this.use(processor, remarkObsidianWikilink, {
      contentIndex: this.contentIndex,
      renderNoteEmbed: this.createNoteEmbedRenderer(embedDepth, embedTrail),
    });
    this.use(processor, remarkObsidianCallout);
    this.use(processor, remarkObsidianTag);
    this.use(processor, remarkRehype, { allowDangerousHtml: true });
    this.use(processor, rehypeRaw);
    this.use(processor, rehypeSlug);
    this.use(processor, rehypeFormat);
    this.use(processor, rehypeKatex, { output: "mathml", strict: false });

    for (const plugin of this.options.rehypePlugins ?? []) {
      this.use(processor, plugin);
    }

    this.use(processor, rehypeStringify);

    const file = await processor.process(markDownContent.trim());

    return {
      frontmatter: (file.data.matter || {}) as PostFrontmatter,
      html: String(file.value),
    };
  }

  private use(
    processor: ReturnType<typeof unified>,
    plugin: unknown,
    options?: unknown,
  ) {
    const name = pluginName(plugin);
    console.log(`[pipeline] load plugin: ${name}`);

    const traced = function tracedAttacher(
      this: unknown,
      ...attacherArgs: unknown[]
    ) {
      const transformer = (
        plugin as (this: unknown, ...args: unknown[]) => unknown
      ).apply(this, attacherArgs);

      return function tracedTransformer(
        this: unknown,
        ...transformArgs: unknown[]
      ) {
        console.log(`[pipeline] execute plugin: ${name}`);
        if (typeof transformer !== "function") return undefined;
        return transformer.apply(this, transformArgs);
      };
    };

    const register = processor.use.bind(processor) as (
      plugin: unknown,
      options?: unknown,
    ) => unknown;
    if (options === undefined) {
      register(traced);
    } else {
      register(traced, options);
    }
  }

  private createNoteEmbedRenderer(
    embedDepth: number,
    embedTrail: Set<string>,
  ): ((slug: string) => Promise<string | null>) | undefined {
    if (!this.getMarkdownBySlug || embedDepth >= 3) return undefined;

    return async (slug: string) => {
      if (embedTrail.has(slug)) return null;

      const markdown = await this.getMarkdownBySlug?.(slug);
      if (!markdown) return null;

      const nextEmbedTrail = new Set(embedTrail);
      nextEmbedTrail.add(slug);

      const content = await this.execute(
        markdown,
        embedDepth + 1,
        nextEmbedTrail,
      );
      return content.html;
    };
  }
}

function pluginName(plugin: unknown): string {
  if (typeof plugin !== "function") return String(plugin);
  return (plugin as { name?: string }).name || "anonymous";
}
