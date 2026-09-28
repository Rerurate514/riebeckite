import type { RiebeckitePlugin } from "../types/plugin";
import type {
  PluginLifecycleContext,
  PluginManifestContext,
} from "../types/plugin_context";
import type { Tracer } from "../observability";

type LifecycleHookName = "setup" | "buildStart" | "buildEnd" | "dispose";

export class PluginLifecycleError extends Error {
  constructor(pluginName: string, hookName: LifecycleHookName, cause: unknown) {
    super(`Plugin "${pluginName}" failed during "${hookName}"`, { cause });
    this.name = "PluginLifecycleError";
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

async function runLifecycleHook<TContext>(
  plugins: readonly RiebeckitePlugin[],
  hookName: LifecycleHookName,
  getHook: (
    plugin: RiebeckitePlugin,
  ) => ((context: TContext) => void | Promise<void>) | undefined,
  createContext: (plugin: RiebeckitePlugin) => TContext & { tracer: Tracer },
): Promise<void> {
  for (const plugin of plugins) {
    const hook = getHook(plugin);
    if (!hook) continue;

    try {
      const context = createContext(plugin);
      await context.tracer.span(
        `plugin.${hookName}`,
        {
          plugin: plugin.name,
          hook: hookName,
        },
        () => hook(context),
      );
    } catch (error) {
      throw new PluginLifecycleError(plugin.name, hookName, error);
    }
  }
}
