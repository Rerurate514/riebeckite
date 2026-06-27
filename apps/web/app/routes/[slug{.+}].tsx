import { createRoute } from "honox/factory";
import { Pipeline } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { getAllPosts, getPost } from "../logic/get_post";

const pipeline = new Pipeline();

export default createRoute(
  ssgParams(async () => {
    const posts = await getAllPosts();
    return posts.map((post) => ({ slug: post.slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");

    const post = await getPost(slug!);
    const content = await pipeline.execute(post);

    return c.render(
      <article class="prose">
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      </article>,
    );
  },
);
