import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import Article from "../../components/article/article";
import {
  ARCHIVE_BASE_PATH,
  buildArchivePage,
  buildCollections,
  findCollection,
} from "../../lib/collections";
import { buildArchiveSeo, getHtmlLanguage } from "../../lib/seo";

const ARCHIVE_PREFIX = `${ARCHIVE_BASE_PATH}/`;

export default createRoute(
  ssgParams(async () => {
    const collections = await buildCollections(getHtmlLanguage());
    return collections
      .filter((collection) => collection.kind === "archive")
      .map((collection) => ({
        slug: collection.path.slice(ARCHIVE_PREFIX.length),
      }));
  }),
  async (c) => {
    const slug = c.req.param("slug");
    if (!slug) return c.notFound();

    const lang = getHtmlLanguage();
    const collection = await findCollection(
      "archive",
      `${ARCHIVE_PREFIX}${slug}`,
      lang,
    );
    if (!collection) return c.notFound();

    c.set("htmlLanguage", lang);
    c.set("seo", buildArchiveSeo(collection.title, collection.path, lang));

    return c.render(<Article content={buildArchivePage(collection, lang)} />);
  },
);
