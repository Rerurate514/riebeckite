import { defineConfig } from "@riebeckite/core";
import { aliasPlugin } from "@riebeckite/plugin-alias";
import { analytics } from "@riebeckite/plugin-analytics";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { bases } from "@riebeckite/plugin-bases";
import { canvas } from "@riebeckite/plugin-canvas";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { attachment } from "@riebeckite/plugin-attachment";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { highlight } from "@riebeckite/plugin-highlight";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { kanban } from "@riebeckite/plugin-kanban";
import { d2 } from "@riebeckite/plugin-d2";
import { graphviz } from "@riebeckite/plugin-graphviz";
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
import { uxPlugin } from "@riebeckite/plugin-ux";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { wavedrom } from "@riebeckite/plugin-wavedrom";
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
    graphviz({ render: "build", engine: "dot" }),
    autoCardLinkPlugin(),
    highlight(),
    d2(),
    tocPlugin(),
    vegaLite(),
    wavedrom(),
    backlinksPlugin(),
    queryPlugin(),
    bases(),
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
    uxPlugin(),
    localFixturePlugin(),
  ],
});
