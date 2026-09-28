import type { RiebeckitePlugin } from "../types/plugin";
import type {
  PluginLifecycleContext,
  PluginManifestContext,
} from "../types/plugin_context";

type LifecycleHookName = "setup" | "buildStart" | "buildEnd" | "dispose";

export class PluginLifecycleError extends Error {
  constructor(pluginName: string, hookName: LifecycleHookName, cause: unknown) {
    super(`Plugin "${pluginName}" failed during "${hookName}"`, { cause });
    this.name = "PluginLifecycleError";
  }
}

export async function runSetup(
  plugins: readonly RiebeckitePlugin[],
  context: PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(plugins, "setup", (plugin) => plugin.setup, context);
}

export async function runBuildStart(
  plugins: readonly RiebeckitePlugin[],
  context: PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "buildStart",
    (plugin) => plugin.buildStart,
    context,
  );
}

export async function runBuildEnd(
  plugins: readonly RiebeckitePlugin[],
  context: PluginManifestContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "buildEnd",
    (plugin) => plugin.buildEnd,
    context,
  );
}

export async function runDispose(
  plugins: readonly RiebeckitePlugin[],
  context: PluginLifecycleContext,
): Promise<void> {
  await runLifecycleHook(
    plugins,
    "dispose",
    (plugin) => plugin.dispose,
    context,
  );
}

async function runLifecycleHook<TContext>(
  plugins: readonly RiebeckitePlugin[],
  hookName: LifecycleHookName,
  getHook: (
    plugin: RiebeckitePlugin,
  ) => ((context: TContext) => void | Promise<void>) | undefined,
  context: TContext,
): Promise<void> {
  for (const plugin of plugins) {
    const hook = getHook(plugin);
    if (!hook) continue;

    try {
      await hook(context);
    } catch (error) {
      throw new PluginLifecycleError(plugin.name, hookName, error);
    }
  }
}
