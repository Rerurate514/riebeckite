declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "virtual:riebeckite/config" {
  export const config: import("@riebeckite/core").ResolvedRiebeckiteConfig;
}

declare module "virtual:riebeckite/content" {
  export const content: import("@riebeckite/core").ContentManager;
}

declare module "hono" {
  interface Env {
    Variables: {
      headTags?: readonly import("@riebeckite/core").PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
