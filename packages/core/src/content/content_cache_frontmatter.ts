import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { PostContent } from "../types/post_content.js";

export function extractFrontmatter(
  markdown: string,
): PostContent["frontmatter"] {
  const vfile = new VFile({ value: markdown });
  matter(vfile);
  return (vfile.data.matter ?? {}) as PostContent["frontmatter"];
}
