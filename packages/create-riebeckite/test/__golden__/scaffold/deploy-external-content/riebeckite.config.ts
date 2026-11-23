import { defineConfig } from "@riebeckite/core";
import { deploy } from "@riebeckite/plugin-deploy";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  site: {
    title: "deploy-external-content",
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
    deploy({ provider: "cloudflare-workers" }),
  ],
});
