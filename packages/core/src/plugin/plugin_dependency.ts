import type { RiebeckitePlugin } from "../types/plugin.js";
import {
  type CapabilityDeclaration,
  PluginDependencyError,
} from "./plugin_dependency_error.js";

type PluginDependency = {
  providerIndex: number;
  capability: string;
};

export function resolvePluginDependencies(
  plugins: readonly RiebeckitePlugin[],
): RiebeckitePlugin[] {
  validateCapabilityNames(plugins);
  const providers = collectProviders(plugins);
  const dependencies = collectDependencies(plugins, providers);
  return stableTopologicalSort(plugins, dependencies);
}

const CAPABILITY_DECLARATIONS: readonly CapabilityDeclaration[] = [
  "provides",
  "requires",
  "optional",
];

function validateCapabilityNames(plugins: readonly RiebeckitePlugin[]): void {
  for (const plugin of plugins) {
    for (const declaration of CAPABILITY_DECLARATIONS) {
      for (const capability of plugin[declaration] ?? []) {
        if (capability.trim() === "") {
          throw new PluginDependencyError({
            kind: "invalid-capability",
            pluginName: plugin.name,
            declaration,
          });
        }
      }
    }
  }
}

function collectProviders(
  plugins: readonly RiebeckitePlugin[],
): Map<string, number> {
  const providerIndices = new Map<string, number[]>();

  for (const [index, plugin] of plugins.entries()) {
    for (const capability of new Set((plugin.provides ?? []).map(normalize))) {
      const indices = providerIndices.get(capability) ?? [];
      indices.push(index);
      providerIndices.set(capability, indices);
    }
  }

  const providers = new Map<string, number>();
  for (const [capability, indices] of providerIndices) {
    if (indices.length > 1) {
      throw new PluginDependencyError({
        kind: "duplicate-provider",
        capability,
        pluginNames: indices.map((index) => plugins[index].name),
      });
    }
    providers.set(capability, indices[0]);
  }

  return providers;
}

function collectDependencies(
  plugins: readonly RiebeckitePlugin[],
  providers: ReadonlyMap<string, number>,
): PluginDependency[][] {
  const availableCapabilities = [...providers.keys()];

  return plugins.map((plugin, pluginIndex) => {
    const requiredDependencies = (plugin.requires ?? []).map(
      (rawCapability) => {
        const capability = normalize(rawCapability);
        return resolveDependency({
          pluginIndex,
          pluginName: plugin.name,
          capability,
          availableCapabilities,
          providers,
        });
      },
    );
    const optionalDependencies = (plugin.optional ?? []).flatMap(
      (rawCapability) => {
        const capability = normalize(rawCapability);
        const providerIndex = providers.get(capability);
        if (providerIndex === undefined) return [];
        assertNotSelfDependency({
          pluginIndex,
          pluginName: plugin.name,
          capability,
          providerIndex,
        });
        return [{ providerIndex, capability }];
      },
    );

    return [...requiredDependencies, ...optionalDependencies];
  });
}

function resolveDependency(input: {
  pluginIndex: number;
  pluginName: string;
  capability: string;
  availableCapabilities: readonly string[];
  providers: ReadonlyMap<string, number>;
}): PluginDependency {
  const providerIndex = input.providers.get(input.capability);
  if (providerIndex === undefined) {
    throw new PluginDependencyError({
      kind: "missing-capability",
      pluginName: input.pluginName,
      capability: input.capability,
      availableCapabilities: input.availableCapabilities,
    });
  }
  assertNotSelfDependency({
    pluginIndex: input.pluginIndex,
    pluginName: input.pluginName,
    capability: input.capability,
    providerIndex,
  });
  return { providerIndex, capability: input.capability };
}

function assertNotSelfDependency(input: {
  pluginIndex: number;
  pluginName: string;
  capability: string;
  providerIndex: number;
}): void {
  if (input.providerIndex !== input.pluginIndex) return;
  throw new PluginDependencyError({
    kind: "self-dependency",
    pluginName: input.pluginName,
    capability: input.capability,
  });
}

function normalize(capability: string): string {
  return capability.trim();
}

function stableTopologicalSort(
  plugins: readonly RiebeckitePlugin[],
  dependencies: readonly PluginDependency[][],
): RiebeckitePlugin[] {
  const dependents = plugins.map(() => new Set<number>());
  const remainingDependencies = dependencies.map(
    (pluginDependencies, index) => {
      for (const dependency of pluginDependencies) {
        dependents[dependency.providerIndex].add(index);
      }
      return new Set(
        pluginDependencies.map((dependency) => dependency.providerIndex),
      ).size;
    },
  );
  const available = remainingDependencies
    .map((count, index) => (count === 0 ? index : -1))
    .filter((index) => index >= 0);
  const resolved: RiebeckitePlugin[] = [];

  while (available.length > 0) {
    const index = available.shift();
    if (index === undefined) break;

    resolved.push(plugins[index]);
    for (const dependentIndex of dependents[index]) {
      remainingDependencies[dependentIndex] -= 1;
      if (remainingDependencies[dependentIndex] === 0) {
        insertByOriginalOrder(available, dependentIndex);
      }
    }
  }

  if (resolved.length !== plugins.length) {
    throw createCycleError(plugins, dependencies, remainingDependencies);
  }

  return resolved;
}

function insertByOriginalOrder(indices: number[], index: number): void {
  const insertionIndex = indices.findIndex((current) => current > index);
  if (insertionIndex === -1) {
    indices.push(index);
    return;
  }
  indices.splice(insertionIndex, 0, index);
}

function createCycleError(
  plugins: readonly RiebeckitePlugin[],
  dependencies: readonly PluginDependency[][],
  remainingDependencies: readonly number[],
): PluginDependencyError {
  const remaining = new Set(
    remainingDependencies
      .map((count, index) => (count > 0 ? index : -1))
      .filter((index) => index >= 0),
  );
  const cycle = findCycle(dependencies, remaining);
  const chain = cycle.indices.map((index) => plugins[index].name);

  return new PluginDependencyError({
    kind: "cycle",
    capability: cycle.capability,
    pluginNames: chain,
    chain,
  });
}

function findCycle(
  dependencies: readonly PluginDependency[][],
  remaining: ReadonlySet<number>,
): { indices: number[]; capability: string } {
  const visiting: number[] = [];
  const visited = new Set<number>();

  for (const index of remaining) {
    const cycle = visitDependency(
      index,
      dependencies,
      remaining,
      visiting,
      visited,
    );
    if (cycle) return cycle;
  }

  throw new Error("Plugin dependency cycle could not be resolved.");
}

function visitDependency(
  index: number,
  dependencies: readonly PluginDependency[][],
  remaining: ReadonlySet<number>,
  visiting: number[],
  visited: Set<number>,
): { indices: number[]; capability: string } | undefined {
  if (visited.has(index)) return undefined;

  visiting.push(index);
  for (const dependency of dependencies[index]) {
    if (!remaining.has(dependency.providerIndex)) continue;

    const cycleStart = visiting.indexOf(dependency.providerIndex);
    if (cycleStart >= 0) {
      return {
        indices: [...visiting.slice(cycleStart), dependency.providerIndex],
        capability: dependency.capability,
      };
    }

    const cycle = visitDependency(
      dependency.providerIndex,
      dependencies,
      remaining,
      visiting,
      visited,
    );
    if (cycle) return cycle;
  }

  visiting.pop();
  visited.add(index);
  return undefined;
}
