import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../../components/article/article";
import {
  ARCHIVE_BASE_PATH,
  buildArchivePage,
  buildCollections,
  findCollection,
} from "../../lib/collections";
import { buildArchiveSeo } from "../../lib/seo";

const ARCHIVE_PREFIX = `${ARCHIVE_BASE_PATH}/`;

export default createRoute(
  ssgParams(async () => {
    const collections = await buildCollections();
    return collections
      .filter((collection) => collection.kind === "archive")
      .map((collection) => ({
        slug: collection.path.slice(ARCHIVE_PREFIX.length),
      }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const collection = await findCollection(
      "archive",
      `${ARCHIVE_PREFIX}${slug}`,
    );
    if (!collection) return c.notFound();

    c.set("seo", buildArchiveSeo(collection.title, collection.path));

    return c.render(<Article content={buildArchivePage(collection)} />);
  },
);
