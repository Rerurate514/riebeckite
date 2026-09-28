import type { RiebeckitePlugin } from "../types/plugin";
import { PluginDependencyError } from "./plugin_dependency_error";

type PluginDependency = {
  providerIndex: number;
  capability: string;
};

export function resolvePluginDependencies(
  plugins: readonly RiebeckitePlugin[],
): RiebeckitePlugin[] {
  const providers = collectProviders(plugins);
  const dependencies = collectDependencies(plugins, providers);
  return stableTopologicalSort(plugins, dependencies);
}

function collectProviders(
  plugins: readonly RiebeckitePlugin[],
): Map<string, number> {
  const providerIndices = new Map<string, number[]>();

  for (const [index, plugin] of plugins.entries()) {
    for (const capability of new Set(plugin.provides ?? [])) {
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
  return plugins.map((plugin) => {
    const requiredDependencies = (plugin.requires ?? []).map((capability) => {
      const providerIndex = providers.get(capability);
      if (providerIndex === undefined) {
        throw new PluginDependencyError({
          kind: "missing-capability",
          pluginName: plugin.name,
          capability,
        });
      }
      return { providerIndex, capability };
    });
    const optionalDependencies = (plugin.optional ?? []).flatMap(
      (capability) => {
        const providerIndex = providers.get(capability);
        return providerIndex === undefined
          ? []
          : [{ providerIndex, capability }];
      },
    );

    return [...requiredDependencies, ...optionalDependencies];
  });
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
