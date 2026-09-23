import type { SeoMetadata } from "./lib/seo";

declare module "virtual:riebeckite-plugin-client" {
  export function initRiebeckitePlugins(): void;
}

declare module "hono" {
  interface Env {
    Variables: {
      seo?: SeoMetadata;
    };
    Bindings: Record<string, never>;
  }
}
