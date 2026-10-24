import type { PluginHeadTag } from "@riebeckite/core";

declare module "hono" {
  interface ContextVariableMap {
    headTags?: readonly PluginHeadTag[];
  }
}
