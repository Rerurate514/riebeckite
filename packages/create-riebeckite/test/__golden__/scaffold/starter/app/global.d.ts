declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "virtual:riebeckite/config" {
  export const config: import("@riebeckite/core").ResolvedRiebeckiteConfig;
}

declare module "virtual:riebeckite/content" {
  export const content: import("@riebeckite/core").ContentManager;
}

declare module "virtual:riebeckite/content-renderers" {
  export function renderContent(
    sourcePath: string,
  ): import("hono/jsx").Child | undefined;
}
