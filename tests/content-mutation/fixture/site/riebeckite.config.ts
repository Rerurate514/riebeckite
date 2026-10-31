import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { hoverPreview } from "@riebeckite/plugin-hover-preview";
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
  provenance: {
    enabled: process.env.RIEBECKITE_DISABLE_PROVENANCE !== "1",
  },
  plugins: [
    obsidianMarkdown(),
    media(),
    attachment(),
    hoverPreview(),
    seo({ sitemap: true }),
  ],
  theme: defaultTheme(),
});
