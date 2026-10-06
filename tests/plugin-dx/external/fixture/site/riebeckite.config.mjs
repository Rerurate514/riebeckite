import { pluginDemoPlugin } from "@plugin-dx/demo";
import { markdownHighlightPlugin } from "@plugin-dx/markdown-highlight";
import { relatedPostsPlugin } from "@plugin-dx/related-posts";
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
    relatedPostsPlugin({ max: 2 }),
    pluginDemoPlugin(),
  ],
});
