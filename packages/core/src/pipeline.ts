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
import { remarkObsidianBlockReference } from "./plugins/remark_obsidian_block_reference";
import { remarkObsidianCallout } from "./plugins/remark_obsidian_callout";
import { remarkObsidianTag } from "./plugins/remark_obsidian_tag";
import {
  remarkObsidianWikilink,
  type WikilinkFragment,
} from "./plugins/remark_obsidian_wikilink";
import type { RiebeckitePlugin } from "./types/plugin";
import { resolvePlugins } from "./types/plugin";
import type { PostContent, PostFrontmatter } from "./types/post_content";

export interface PipelineOptions {
  plugins?: RiebeckitePlugin[];
}

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
    this.use(processor, remarkObsidianBlockReference);
    this.use(processor, remarkObsidianWikilink, {
      contentIndex: this.contentIndex,
      renderNoteEmbed: this.createNoteEmbedRenderer(embedDepth, embedTrail),
      renderAttachment: this.createAttachmentRenderer(),
    });
    this.use(processor, remarkObsidianCallout);
    this.use(processor, remarkObsidianTag);

    for (const plugin of plugins) {
      for (const remarkPlugin of plugin.remarkPlugins ?? []) {
        this.use(processor, remarkPlugin);
      }
      plugin.extendMarkdownPipeline?.({
        use: (pipelinePlugin, options) => {
          this.use(processor, pipelinePlugin, options);
        },
      });
    }

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
    embedTrail: Set<string>,
  ):
    | ((
        slug: string,
        fragment: WikilinkFragment | null,
      ) => Promise<string | null>)
    | undefined {
    if (!this.getMarkdownBySlug || embedDepth >= 3) return undefined;

    return async (slug: string, fragment: WikilinkFragment | null) => {
      if (embedTrail.has(slug)) return null;

      const sourceMarkdown = await this.getMarkdownBySlug?.(slug);
      const markdown = sourceMarkdown
        ? selectEmbedMarkdownFragment(sourceMarkdown, fragment)
        : null;
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

  private createAttachmentRenderer() {
    const plugins = resolvePlugins(this.options.plugins).filter(
      (plugin) => plugin.renderAttachment,
    );
    if (plugins.length === 0) return undefined;

    return async (input: {
      path: string;
      raw: string;
      label: string;
      url: string;
      embed: boolean;
    }) => {
      for (const plugin of plugins) {
        const html = await plugin.renderAttachment?.({
          config: this.options.config,
          contentIndex: this.contentIndex,
          diagnostics: [],
          ...input,
        });
        if (html) return html;
      }
      return null;
    };
  }
}

function selectEmbedMarkdownFragment(
  markdown: string,
  fragment: WikilinkFragment | null,
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
