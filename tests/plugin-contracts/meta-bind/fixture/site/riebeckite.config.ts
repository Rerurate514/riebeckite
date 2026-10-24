import { defineConfig } from "@riebeckite/core";
import { metaBind } from "@riebeckite/plugin-meta-bind";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Meta Bind Contract",
    description: "Isolated Meta Bind contract fixture.",
    baseUrl: "https://meta-bind.example.com",
    locale: "en",
  },
  content: {
    directory: "../vault",
  },
  spa: {},
  theme: defaultTheme(),
  plugins: [metaBind()],
});
