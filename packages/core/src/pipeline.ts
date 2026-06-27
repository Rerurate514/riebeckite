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

export class Pipeline {
  async execute(markDownContent: string): Promise<PostContent> {
    const file = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkFrontmatter, ["yaml", "toml"])
      .use(remarkMath)
      .use(remarkGfm)
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
