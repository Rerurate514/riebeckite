import { createRoute } from "honox/factory";
import { BlogIndex } from "../../components/blog/blog-index";
import { getBlogIndexHeadTags } from "../../lib/blog";
import { buildWebsiteSeo } from "../../lib/seo";

export default createRoute((c) => {
  const headTags = getBlogIndexHeadTags("en");
  c.set(
    "seo",
    buildWebsiteSeo(
      {
        title: "Blog",
        description:
          "Release notes, engineering deep dives, comparisons with other static site generators, and practical guides for publishing Markdown and Obsidian notes with Riebeckite.",
        path: "/blog/",
      },
      headTags,
    ),
  );
  c.set("headTags", headTags);

  return c.render(<BlogIndex locale="en" />);
});
