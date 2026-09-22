import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../../components/article/article";
import { buildTagIndex, buildTagPage } from "../../lib/tags";

export default createRoute(
  ssgParams(async () => {
    const tagIndex = await buildTagIndex();
    return Array.from(tagIndex.keys()).map((slug) => ({ slug }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const tagIndex = await buildTagIndex();
    const entry = tagIndex.get(slug);
    if (!entry) return c.notFound();

    return c.render(<Article content={buildTagPage(entry)} />);
  },
);
