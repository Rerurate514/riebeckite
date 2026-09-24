import { definePlugin } from "@riebeckite/core";

export { default as RecentPosts } from "./components/recent-posts";
export type { RecentPost } from "./src/recent-posts";
export { getRecentPosts } from "./src/recent-posts.server";

export function recentPostsPlugin() {
  return definePlugin({
    name: "recent-posts",
    assets: [
      {
        pluginName: "recent-posts",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-recent-posts/style.css",
      },
    ],
  });
}
