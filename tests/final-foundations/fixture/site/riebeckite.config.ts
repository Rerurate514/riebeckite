import { defineConfig } from "@riebeckite/core";
import { alias } from "@riebeckite/plugin-alias";
import { hoverPreview } from "@riebeckite/plugin-hover-preview";
import { l10n } from "@riebeckite/plugin-l10n";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { permalink } from "@riebeckite/plugin-permalink";

export default defineConfig({
  site: {
    title: "Final Foundations Fixture",
    baseUrl: "https://final.example.com",
    locale: "en",
  },
  content: {
    directory: "../vault",
    filters: { publishStrategy: "selective" },
  },
  provenance: {
    enabled: process.env.RIEBECKITE_DISABLE_PROVENANCE !== "1",
  },
  spa: {},
  plugins: [
    obsidianMarkdown(),
    l10n({ defaultLang: "en", languages: ["en", "ja"] }),
    hoverPreview(),
    permalink({ redirects: { frontmatter: "previous_urls" } }),
    alias(),
  ],
});
