import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { attachment } from "@riebeckite/plugin-attachment";
import { highlight } from "@riebeckite/plugin-highlight";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { searchPlugin } from "@riebeckite/plugin-search";
import { tocPlugin } from "@riebeckite/plugin-toc";
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
    highlight(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    recentPostsPlugin(),
    searchPlugin(),
  ],
});
