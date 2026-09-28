import { defineConfig } from "@riebeckite/core";
import { aliasPlugin } from "@riebeckite/plugin-alias";
import { analytics } from "@riebeckite/plugin-analytics";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { canvas } from "@riebeckite/plugin-canvas";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { attachment } from "@riebeckite/plugin-attachment";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { highlight } from "@riebeckite/plugin-highlight";
import { d2 } from "@riebeckite/plugin-d2";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { searchPlugin } from "@riebeckite/plugin-search";
import { series } from "@riebeckite/plugin-series";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
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
    analytics({ provider: "plausible", domain: "example.com" }),
    obsidianMarkdown(),
    properties(),
    plantuml(),
    media(),
    attachment(),
    codeAnnotations(),
    canvas(),
    aliasPlugin(),
    autoCardLinkPlugin(),
    highlight(),
    d2(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    dataviewPlugin(),
    flashcardsPlugin(),
    kanban(),
    chartjs(),
    recentPostsPlugin(),
    relatedPosts(),
    responsiveImage(),
    richEmbed(),
    searchPlugin(),
    hoverPreviewPlugin(),
    shortcodes(),
    series(),
    localFixturePlugin(),
  ],
});
