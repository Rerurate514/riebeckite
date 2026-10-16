import type { RiebeckitePlugin } from "../types/plugin.js";

const capabilityRegistryKey = Symbol.for(
  "@riebeckite/core/generated-output-planner-capability",
);

const trustedPlanners = (() => {
  const registry = globalThis as {
    [capabilityRegistryKey]?: WeakMap<
      RiebeckitePlugin,
      NonNullable<RiebeckitePlugin["planGeneratedOutputs"]>
    >;
  };
  const existing = registry[capabilityRegistryKey];
  if (existing) return existing;
  const created = new WeakMap<
    RiebeckitePlugin,
    NonNullable<RiebeckitePlugin["planGeneratedOutputs"]>
  >();
  registry[capabilityRegistryKey] = created;
  return created;
})();

export function registerTrustedGeneratedOutputPlanner<
  TPlugin extends RiebeckitePlugin,
>(plugin: TPlugin): TPlugin {
  if (!plugin.planGeneratedOutputs) {
    throw new Error("A generated-output planner is required for registration.");
  }
  trustedPlanners.set(plugin, plugin.planGeneratedOutputs);
  return plugin;
}

export function isTrustedGeneratedOutputPlanner(
  plugin: RiebeckitePlugin,
): boolean {
  return (
    plugin.planGeneratedOutputs !== undefined &&
    trustedPlanners.get(plugin) === plugin.planGeneratedOutputs
  );
}
