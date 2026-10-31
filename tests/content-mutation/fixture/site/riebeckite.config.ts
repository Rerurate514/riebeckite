import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { seo } from "@riebeckite/plugin-seo";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Mutation Fixture",
    description: "Content mutation integration fixture",
    baseUrl: "https://fixture.example.com",
    locale: "en",
  },
  content: {
    directory: "../vault",
    defaultVisibility: "public",
    publishStrategy: "selective",
  },
  plugins: [obsidianMarkdown(), media(), attachment(), seo({ sitemap: true })],
  theme: defaultTheme(),
});
