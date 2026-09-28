import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { searchPlugin } from "@riebeckite/plugin-search";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { localFixturePlugin } from "./extensions/local-plugin";
import { localFixtureTheme } from "./extensions/local-theme";

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
  theme: localFixtureTheme(),
  plugins: [
    obsidianMarkdown(),
    media(),
    attachment(),
    autoCardLinkPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    recentPostsPlugin(),
    relatedPosts(),
    searchPlugin(),
    localFixturePlugin(),
  ],
});
