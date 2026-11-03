import { createRoute } from "honox/factory";
import { ThemeShowcase } from "../../components/theme-showcase";
import { buildWebsiteSeo } from "../../lib/seo";

export default createRoute((c) => {
  c.set("htmlLanguage", "ja");
  c.set(
    "seo",
    buildWebsiteSeo(
      {
        title: "テーマプレビュー",
        description:
          "すべての公式 Riebeckite テーマを、同じ Markdown レンダリングで試せます。",
        path: "/ja/themes",
      },
      [],
      "ja",
    ),
  );
  c.set("headTags", []);

  return c.render(<ThemeShowcase locale="ja" />);
});
