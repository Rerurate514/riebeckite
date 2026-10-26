import { createRoute } from "honox/factory";
import { ThemeShowcase } from "../components/theme-showcase";
import { buildWebsiteSeo } from "../lib/seo";

export default createRoute((c) => {
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Theme showcase",
      description:
        "Try every official Riebeckite theme with the same rendered Markdown.",
      path: "/themes",
    }),
  );
  c.set("headTags", []);

  return c.render(<ThemeShowcase locale="en" />);
});
