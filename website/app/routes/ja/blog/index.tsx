import { createRoute } from "honox/factory";
import { BlogIndex } from "../../../components/blog/blog-index";
import { getBlogIndexHeadTags } from "../../../lib/blog";
import { buildWebsiteSeo } from "../../../lib/seo";

export default createRoute((c) => {
  c.set("htmlLanguage", "ja");
  const headTags = getBlogIndexHeadTags("ja");
  c.set(
    "seo",
    buildWebsiteSeo(
      {
        title: "ブログ",
        description:
          "Markdown と Obsidian のノートを Web サイトとして公開するための、リリース情報・技術記事・他ツールとの比較・実践ガイド。",
        path: "/ja/blog/",
      },
      headTags,
      "ja",
    ),
  );
  c.set("headTags", headTags);

  return c.render(<BlogIndex locale="ja" />);
});
