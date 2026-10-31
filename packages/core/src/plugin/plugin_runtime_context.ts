import type { PluginContext } from "../types/plugin_context.js";

export type PluginContextBase = Omit<
  PluginContext,
  "cache" | "derived" | "logger" | "tracer" | "output"
>;

export type PluginContextWithCache<TContext extends PluginContextBase> =
  TContext &
    Pick<PluginContext, "cache" | "logger" | "tracer" | "output"> & {
      derived: NonNullable<PluginContext["derived"]>;
    };
