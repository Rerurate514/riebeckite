import { defineConfig } from "@riebeckite/core";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Inspector E2E",
    description: "Development Inspector end-to-end fixture.",
    baseUrl: "https://inspector.example.com",
    locale: "en",
  },
  content: { directory: "content", exclude: ["ignored/**"] },
  spa: {},
  theme: defaultTheme(),
  plugins: [diagnostics({ requiredFrontmatter: ["title"] })],
});
