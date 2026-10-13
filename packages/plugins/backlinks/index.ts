import {
  appendContentBodySlot,
  type ConfigValidationIssue,
  definePlugin,
} from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import Backlinks from "./components/backlinks.js";
import { getPublishedBacklinks } from "./src/backlinks.server.js";

export { default as Backlinks } from "./components/backlinks.js";
export type { ArticleBacklink } from "./src/backlinks.js";
export { getPublishedBacklinks } from "./src/backlinks.server.js";

export type BacklinksOptions = {
  render?: boolean;
};

export function backlinksPlugin(options: BacklinksOptions = {}) {
  return definePlugin({
    name: "backlinks",
    order: 500,
    options,
    validateOptions: validateBacklinksOptions,
    onManifestCreated: ({ config, manifest }) => {
      if (options.render === false) return;
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

function validateBacklinksOptions(
  options: BacklinksOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (
    !options ||
    options.render === undefined ||
    typeof options.render === "boolean"
  ) {
    return [];
  }
  return [{ path: "render", message: "Expected a boolean." }];
}

function resolveTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim()) return title;
  return slug.split("/").at(-1) ?? slug;
}
