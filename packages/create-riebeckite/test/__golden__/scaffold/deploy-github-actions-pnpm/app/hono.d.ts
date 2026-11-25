import "hono";

declare module "hono" {
  interface Env {
    Variables: {
      headTags?: readonly import("@riebeckite/core").PluginHeadTag[];
      htmlLanguage?: string;
      seo?: import("@riebeckite/core").SeoMetadata;
    };
    Bindings: Record<string, never>;
  }
}
