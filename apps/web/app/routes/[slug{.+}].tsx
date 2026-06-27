import { createRoute } from "honox/factory";
import { Pipeline } from "@riebeckite/core";
import { ssgParams } from "hono/ssg";
import { contentDir } from "../constants/paths";
import fs from "node:fs/promises";
import path from "node:path";

const pipeline = new Pipeline();

async function getAllPosts() {
  const files = await fs.readdir(contentDir);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

async function getPost(slug: string) {
  const filePath = path.join(contentDir, `${slug}.md`);
  return await fs.readFile(filePath, "utf-8");
}

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
      <article>
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      </article>,
    );
  },
);
