import { createRoute } from "honox/factory";
import { buildContentIndex, getPost } from "../logic/get_post";
import { Pipeline, PostContent } from "@riebeckite/core";
import Article from "../components/article";

let cachedIndex: Map<string, string> | null = null;
async function getContentIndex() {
  if (!cachedIndex) cachedIndex = await buildContentIndex();
  return cachedIndex;
}

let cachedContent: PostContent | null = null;

export default createRoute(async (c) => {
  if (!cachedContent) {
    const post = await getPost("index");
    const contentIndex = await getContentIndex();
    const pipeline = new Pipeline(contentIndex);
    cachedContent = await pipeline.execute(post);
  }

  if (!cachedContent?.frontmatter.publish) {
    return c.notFound();
  }

  return c.render(<Article content={cachedContent} />);
});
