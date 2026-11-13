declare module "virtual:riebeckite/content-renderers" {
  import type { Child } from "hono/jsx";

  export function renderContent(sourcePath: string): Child | undefined;
}
