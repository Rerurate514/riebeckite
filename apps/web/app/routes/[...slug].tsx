import { createRoute } from "honox/factory";
import { Pipeline } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";

const pipeline = new Pipeline();

export default createRoute(
    ssgParams(async () => {
        const posts = await getAllPosts();
        return posts.map((post) => ({ slug: post.slug }));
    }),
    async (c) => {
    const slug = c.req.param("slug");

    const post = await getPost(slug);

    return c.render(
        <article>
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
    );
});
