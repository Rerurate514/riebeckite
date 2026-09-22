import type { SeoMetadata } from "./lib/seo";

declare module "hono" {
  interface Env {
    Variables: {
      seo?: SeoMetadata;
    };
    Bindings: Record<string, never>;
  }
}
