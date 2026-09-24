import type { SeoMetadata } from "./lib/seo";

declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "hono" {
  interface Env {
    Variables: {
      seo?: SeoMetadata;
    };
    Bindings: Record<string, never>;
  }
}
