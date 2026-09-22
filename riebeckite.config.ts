import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  site: {
    title: "Riebeckite Blog",
    description: "An Obsidian-to-Hono Blog Framework",
    author: "Your Name",
    baseUrl: "https://my-blog.pages.dev",
    locale: "ja_JP",
    defaultOgImage: "/ogp.png",
    feed: {
      language: "ja",
    },
  },
  content: {
    directory: "../../content",
    exclude: ["**/templates/**", "**/private/**"],
    filters: {
      publishStrategy: "explicit",
    },
  },
  markdown: {},
  plugins: [autoCardLinkPlugin(), lightboxPlugin()],
});
