import { createRoute } from "honox/factory";
import { BlogIndex, blogIndexCopy } from "../../components/blog/blog-index";
import { getBlogIndexHeadTags } from "../../lib/blog";
import { buildWebsiteSeo } from "../../lib/seo";

export default createRoute((c) => {
  const headTags = getBlogIndexHeadTags("en");
  c.set(
    "seo",
    buildWebsiteSeo(
      {
        title: blogIndexCopy.en.title,
        description: blogIndexCopy.en.description,
        path: "/blog",
      },
      headTags,
    ),
  );
  c.set("headTags", headTags);

  return c.render(<BlogIndex locale="en" />);
});
