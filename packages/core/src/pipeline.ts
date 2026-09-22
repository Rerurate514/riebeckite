import rehypeFormat from "rehype-format";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { matter } from "vfile-matter";
import { remarkObsidianCallout } from "./plugins/remark_obsidian_callout";
import { remarkObsidianTag } from "./plugins/remark_obsidian_tag";
import { remarkObsidianWikilink } from "./plugins/remark_obsidian_wikilink";
import type { PostContent, PostFrontmatter } from "./types/post_content";

export class Pipeline {
  constructor(
    private contentIndex: Map<string, string>,
    private getMarkdownBySlug?: (slug: string) => Promise<string>,
  ) {}

  async execute(
    markDownContent: string,
    embedDepth = 0,
    embedTrail = new Set<string>(),
  ): Promise<PostContent> {
    const file = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkFrontmatter, ["yaml", "toml"])
      .use(() => {
        return (_, file) => {
          matter(file);
        };
      })
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkObsidianWikilink, {
        contentIndex: this.contentIndex,
        renderNoteEmbed: this.createNoteEmbedRenderer(embedDepth, embedTrail),
      })
      .use(remarkObsidianCallout)
      .use(remarkObsidianTag)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeFormat)
      .use(rehypeKatex, { output: "mathml", strict: false })
      .use(rehypeStringify)
      .process(markDownContent.trim());

    return {
      frontmatter: (file.data.matter || {}) as PostFrontmatter,
      html: String(file.value),
    };
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
