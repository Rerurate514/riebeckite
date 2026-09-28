// Hono's `Env` is a type alias, so an external site cannot augment it with
// `interface Env`. Context variables are typed through the mergeable
// `ContextVariableMap` interface instead.
import type { PluginHeadTag } from "@riebeckite/core";

declare module "hono" {
  interface ContextVariableMap {
    headTags?: readonly PluginHeadTag[];
  }
}
