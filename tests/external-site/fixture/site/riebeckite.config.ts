import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { searchPlugin } from "@riebeckite/plugin-search";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Riebeckite External Fixture",
    description: "A site built only from published Riebeckite packages.",
    baseUrl: "https://external.example.com",
    locale: "en",
  },
  content: {
    directory: "../vault",
  },
  theme: defaultTheme(),
  plugins: [
    obsidianMarkdown(),
    media(),
    attachment(),
    autoCardLinkPlugin(),
    tocPlugin(),
    vegaLite(),
    backlinksPlugin(),
    queryPlugin(),
    recentPostsPlugin(),
    searchPlugin(),
  ],
});
