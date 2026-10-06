import { type PluginDemoOptions, pluginDemoPlugin } from "@plugin-dx/demo";
import { initPluginDemo } from "@plugin-dx/demo/client";
import {
  type HighlightOptions,
  markdownHighlightPlugin,
} from "@plugin-dx/markdown-highlight";
import {
  findRelatedPosts,
  type RelatedPostsOptions,
  relatedPostsPlugin,
} from "@plugin-dx/related-posts";
import type { RiebeckitePlugin } from "@riebeckite/core";

const highlight: RiebeckitePlugin = markdownHighlightPlugin({
  className: "rr-highlight",
});
const related: RiebeckitePlugin = relatedPostsPlugin({ max: 2 });
const demo: RiebeckitePlugin = pluginDemoPlugin();

const highlightOptions: HighlightOptions = { className: "x" };
const relatedOptions: RelatedPostsOptions = { max: 1, slot: "article.aside" };
const demoOptions: PluginDemoOptions = { heading: "Demo" };

initPluginDemo();

void findRelatedPosts;
void highlight;
void related;
void demo;
void highlightOptions;
void relatedOptions;
void demoOptions;
