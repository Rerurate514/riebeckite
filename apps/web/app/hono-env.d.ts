import type { PluginHeadTag } from "@riebeckite/core";
import type { TableOfContentsItem } from "@riebeckite/plugin-toc";
import type { SeoMetadata } from "./lib/seo";

declare module "hono" {
  interface Env {
    Variables: {
      seo?: SeoMetadata;
      headTags?: readonly PluginHeadTag[];
      htmlLanguage?: string;
      shell?: "docs";
      tocItems?: readonly TableOfContentsItem[];
    };
    Bindings: Record<string, never>;
  }
}
