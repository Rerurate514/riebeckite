import { createRoute } from "honox/factory";
import { Pipeline } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { buildContentIndex, getAllPosts, getPost } from "../logic/get_post";

let cachedIndex: Map<string, string> | null = null;
async function getContentIndex() {
  if (!cachedIndex) cachedIndex = await buildContentIndex();
  return cachedIndex;
}

export default createRoute(
  ssgParams(async () => {
    const posts = await getAllPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");

    if (!slug) {
      return c.notFound();
    }

    const post = await getPost(slug!);
    const contentIndex = await getContentIndex();
    const pipeline = new Pipeline(contentIndex);
    const content = await pipeline.execute(post);

    return c.render(
      <article class="prose">
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      </article>,
    );
  },
);
