import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { attachment } from "@riebeckite/plugin-attachment";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { kanban } from "@riebeckite/plugin-kanban";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { properties } from "@riebeckite/plugin-properties";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
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
    codeAnnotations(),
    autoCardLinkPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    dataviewPlugin(),
    flashcardsPlugin(),
    kanban(),
    recentPostsPlugin(),
    relatedPosts(),
    responsiveImage(),
    searchPlugin(),
    hoverPreviewPlugin(),
    localFixturePlugin(),
  ],
});
