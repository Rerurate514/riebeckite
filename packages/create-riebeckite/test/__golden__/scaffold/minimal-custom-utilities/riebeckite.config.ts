import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  site: {
    title: "minimal-custom-utilities",
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
