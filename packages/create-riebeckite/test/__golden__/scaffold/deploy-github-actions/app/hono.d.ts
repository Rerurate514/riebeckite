import "hono";

declare module "hono" {
  interface Env {
    Variables: {
      headTags?: readonly import("@riebeckite/core").PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
