import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../../components/article/article";
import {
  buildCollections,
  findCollection,
  TAG_BASE_PATH,
} from "../../lib/collections";
import { buildTagSeo } from "../../lib/seo";
import { buildTagPage } from "../../lib/tags";

const TAG_PREFIX = `${TAG_BASE_PATH}/`;

export default createRoute(
  ssgParams(async () => {
    const collections = await buildCollections();
    return collections
      .filter((collection) => collection.kind === "tag")
      .map((collection) => ({
        slug: collection.path.slice(TAG_PREFIX.length),
      }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const collection = await findCollection("tag", `${TAG_PREFIX}${slug}`);
    if (!collection) return c.notFound();

    c.set("seo", buildTagSeo(collection.value, collection.path));
    c.set("headTags", []);

    return c.render(<Article content={buildTagPage(collection)} />);
  },
);
