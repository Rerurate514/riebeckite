import { defineConfig } from "@riebeckite/core";
import { alias } from "@riebeckite/plugin-alias";
import {
  analytics,
  MemoryAnalyticsProvider,
} from "@riebeckite/plugin-analytics";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLink } from "@riebeckite/plugin-autocardlink";
import { backlinks } from "@riebeckite/plugin-backlinks";
import { bases } from "@riebeckite/plugin-bases";
import { canvas } from "@riebeckite/plugin-canvas";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { citations } from "@riebeckite/plugin-citations";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { colorMode } from "@riebeckite/plugin-color-mode";
import { d2 } from "@riebeckite/plugin-d2";
import { dataview } from "@riebeckite/plugin-dataview";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { flashcards } from "@riebeckite/plugin-flashcards";
import { graphviz } from "@riebeckite/plugin-graphviz";
import { highlight } from "@riebeckite/plugin-highlight";
import { hoverPreview } from "@riebeckite/plugin-hover-preview";
import { imageOptimizer } from "@riebeckite/plugin-image-optimizer";
import { kanban } from "@riebeckite/plugin-kanban";
import { markmap } from "@riebeckite/plugin-markmap";
import { marp } from "@riebeckite/plugin-marp";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { query } from "@riebeckite/plugin-query";
import { recentPosts } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { search } from "@riebeckite/plugin-search";
import { series } from "@riebeckite/plugin-series";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { svgOptimizer } from "@riebeckite/plugin-svg-optimizer";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { toc } from "@riebeckite/plugin-toc";
import { ux } from "@riebeckite/plugin-ux";
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
  spa: {},
  theme: localFixtureTheme(),
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "https://analytics.example.com/events" },
    }),
    obsidianMarkdown(),
    discordEmbed(),
    markmap(),
    properties(),
    plantuml(),
    qrCode(),
    media(),
    attachment(),
    marp(),
    codeAnnotations(),
    colorMode(),
    canvas(),
    alias(),
    graphviz({ render: "build", engine: "dot" }),
    autoCardLink(),
    excaliBrain(),
    highlight(),
    d2(),
    toc(),
    vegaLite(),
    wavedrom(),
    backlinks(),
    query(),
    bases(),
    dataview(),
    flashcards(),
    kanban(),
    chartjs(),
    citations({ bibliography: "references.bib" }),
    recentPosts(),
    relatedPosts(),
    imageOptimizer({ widths: [640, 1280] }),
    svgOptimizer(),
    responsiveImage(),
    richEmbed(),
    search(),
    hoverPreview(),
    shortcodes(),
    series(),
    ux(),
    taxonomy(),
    localFixturePlugin(),
  ],
});
