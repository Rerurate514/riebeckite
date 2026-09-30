declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "hono" {
  interface Env {
    Variables: {
      seo?: import("./lib/seo").SeoMetadata;
      headTags?: readonly import("@riebeckite/core").PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
