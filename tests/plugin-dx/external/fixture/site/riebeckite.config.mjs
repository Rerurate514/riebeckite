import { pluginDemoPlugin } from "@plugin-dx/demo";
import { markdownHighlightPlugin } from "@plugin-dx/markdown-highlight";
import { relatedPosts } from "@plugin-dx/related-posts";
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "Plugin DX External",
    locale: "en",
  },
  content: {
    directory: "../vault",
  },
  plugins: [
    markdownHighlightPlugin({ className: "rr-highlight" }),
    relatedPosts({ max: 2 }),
    pluginDemoPlugin(),
  ],
});
