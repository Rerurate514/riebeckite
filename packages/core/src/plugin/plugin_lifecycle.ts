import type { Tracer } from "../observability.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import type {
  PluginLifecycleContext,
  PluginManifestContext,
} from "../types/plugin_context.js";

type LifecycleHookName = "setup" | "buildStart" | "buildEnd" | "dispose";

export class PluginHookError extends Error {
  constructor(pluginName: string, hookName: string, cause: unknown) {
    super(`Plugin "${pluginName}" failed during "${hookName}"`, { cause });
    this.name = "PluginHookError";
  }
}

export async function runPluginHook<
  TContext extends { tracer: Tracer },
  TResult,
>(
  plugin: RiebeckitePlugin,
  hookName: string,
  context: TContext,
  hook: (context: TContext) => TResult | Promise<TResult>,
): Promise<TResult> {
  try {
    return await context.tracer.span(
      `plugin.${hookName}`,
      {
        plugin: plugin.name,
        hook: hookName,
      },
      () => hook(context),
    );
  } catch (error) {
    throw new PluginHookError(plugin.name, hookName, error);
  }
}

export async function runSetup(
  plugins: readonly RiebeckitePlugin[],
  createContext: (plugin: RiebeckitePlugin) => PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "setup",
    (plugin) => plugin.setup,
    createContext,
  );
}

export async function runBuildStart(
  plugins: readonly RiebeckitePlugin[],
  createContext: (plugin: RiebeckitePlugin) => PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "buildStart",
    (plugin) => plugin.buildStart,
    createContext,
  );
}

export async function runBuildEnd(
  plugins: readonly RiebeckitePlugin[],
  createContext: (plugin: RiebeckitePlugin) => PluginManifestContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "buildEnd",
    (plugin) => plugin.buildEnd,
    createContext,
  );
}

export async function runDispose(
  plugins: readonly RiebeckitePlugin[],
  createContext: (plugin: RiebeckitePlugin) => PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(
    [...plugins].reverse(),
    "dispose",
    (plugin) => plugin.dispose,
    createContext,
  );
}

async function runLifecycleHook<TContext extends { tracer: Tracer }>(
  plugins: readonly RiebeckitePlugin[],
  hookName: LifecycleHookName,
  getHook: (
    plugin: RiebeckitePlugin,
  ) => ((context: TContext) => void | Promise<void>) | undefined,
  createContext: (plugin: RiebeckitePlugin) => TContext,
): Promise<void> {
  for (const plugin of plugins) {
    const hook = getHook(plugin);
    if (!hook) continue;

    await runPluginHook(plugin, hookName, createContext(plugin), hook);
  }
}
