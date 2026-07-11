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
import { PostContent } from "./types/post_content";
import { remarkObsidianWikilink } from "./plugins/remark_obsidian_wikilink";
import { remarkObsidianCallout } from "./plugins/remark_obsidian_callout";
import { matter } from "vfile-matter";

export class Pipeline {
  constructor(private contentIndex: Map<string, string>) {}

  async execute(markDownContent: string): Promise<PostContent> {
    const file = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkFrontmatter, ["yaml", "toml"])
      .use(() => {
        return function (_, file) {
          matter(file);
        };
      })
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkObsidianWikilink, { contentIndex: this.contentIndex })
      .use(remarkObsidianCallout)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeFormat)
      .use(rehypeKatex, { output: "mathml" })
      .use(rehypeStringify)
      .process(markDownContent.trim());

    return {
      frontmatter: (file.data.matter || {}) as Record<string, any>,
      html: String(file.value),
    };
  }
}
