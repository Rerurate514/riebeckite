import rehypeFormat from "rehype-format";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import { parse as parseYaml } from "yaml";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export class Pipeline {
  async execute(markDownContent: string) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkExtractFrontmatter, { yaml: parseYaml, remove: true })
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeFormat)
      .use(rehypeSanitize)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(markDownContent.trim());

    console.log(file.value);
    console.log(file.data);
  }
}
