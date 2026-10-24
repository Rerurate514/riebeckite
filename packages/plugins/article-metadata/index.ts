import { createStyleAsset, definePlugin } from "@riebeckite/core";

export type { ArticleMetadataProps } from "./components/article-metadata.js";

export function articleMetadata() {
  return definePlugin({
    name: "article-metadata",
    assets: [
      createStyleAsset(
        "article-metadata",
        "@riebeckite/plugin-article-metadata/style.css",
      ),
    ],
  });
}
