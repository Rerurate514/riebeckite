import type { PluginHeadTag } from "@riebeckite/core";
import type { SeoMetadata } from "./lib/seo";

declare module "hono" {
  interface Env {
    Variables: {
      seo?: SeoMetadata;
      headTags?: readonly PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
