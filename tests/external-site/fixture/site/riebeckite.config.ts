import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { properties } from "@riebeckite/plugin-properties";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
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
    properties(),
    media(),
    attachment(),
    autoCardLinkPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    recentPostsPlugin(),
    searchPlugin(),
    localFixturePlugin(),
  ],
});
