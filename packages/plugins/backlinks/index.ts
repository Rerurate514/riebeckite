import { appendContentBodySlot, definePlugin } from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import Backlinks from "./components/backlinks.js";
import { getPublishedBacklinks } from "./src/backlinks.server.js";

export { default as Backlinks } from "./components/backlinks.js";
export type { ArticleBacklink } from "./src/backlinks.js";
export { getPublishedBacklinks } from "./src/backlinks.server.js";

export function backlinksPlugin() {
  return definePlugin({
    name: "backlinks",
    order: 500,
    onManifestCreated: ({ config, manifest }) => {
      if (!config) return;
      for (const entry of manifest.discoverableEntries) {
        const backlinks = getPublishedBacklinks({
          manifest,
          config,
          slug: entry.slug,
          resolveTitle,
        });
        if (backlinks.length === 0) continue;
        appendContentBodySlot(
          entry,
          "article.footer",
          renderToString(Backlinks({ backlinks })),
        );
      }
    },
    assets: [
      {
        pluginName: "backlinks",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-backlinks/style.css",
      },
    ],
  });
}

function resolveTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim()) return title;
  return slug.split("/").at(-1) ?? slug;
}
