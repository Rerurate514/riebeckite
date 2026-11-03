import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  site: {
    title: "deploy-cloudflare-workers",
    description: "",
    baseUrl: "",
    locale: "en",
  },
  content: {
    directory: "content",
  },
  theme: minimalTheme(),
  plugins: [
    obsidianMarkdown(),
  ],
});
