import { createRoute } from "honox/factory";
import { BlogIndex, blogIndexCopy } from "../../../components/blog/blog-index";
import { getBlogIndexHeadTags } from "../../../lib/blog";
import { buildWebsiteSeo } from "../../../lib/seo";

export default createRoute((c) => {
  c.set("htmlLanguage", "ja");
  const headTags = getBlogIndexHeadTags("ja");
  c.set(
    "seo",
    buildWebsiteSeo(
      {
        title: blogIndexCopy.ja.title,
        description: blogIndexCopy.ja.description,
        path: "/ja/blog",
      },
      headTags,
      "ja",
    ),
  );
  c.set("headTags", headTags);

  return c.render(<BlogIndex locale="ja" />);
});
