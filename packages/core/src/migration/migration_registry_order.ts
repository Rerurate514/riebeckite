import { ContentMigrationRegistryError } from "./migration_registry_errors.js";
import type { ContentMigration } from "./migration_types.js";

export function topologicalOrder(
  selected: readonly ContentMigration[],
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
): readonly ContentMigration[] {
  const selectedById = new Map(
    selected.map((migration) => [migration.id, migration]),
  );
  const indegree = new Map<string, number>();
  const dependents = new Map<string, ContentMigration[]>();

  for (const migration of selected) {
    indegree.set(migration.id, 0);
    dependents.set(migration.id, []);
  }
  for (const migration of selected) {
    for (const dependency of migration.dependsOn) {
      const target = selectedById.get(dependency);
      if (!target) continue;
      indegree.set(migration.id, (indegree.get(migration.id) ?? 0) + 1);
      dependents.get(dependency)?.push(migration);
    }
  }

  const ready = selected
    .filter((migration) => indegree.get(migration.id) === 0)
    .sort(compareMigrations);
  const order: ContentMigration[] = [];
  while (ready.length > 0) {
    const migration = ready.shift();
    if (!migration) break;
    order.push(migration);
    const next = [...(dependents.get(migration.id) ?? [])].sort(
      compareMigrations,
    );
    for (const dependent of next) {
      const remaining = (indegree.get(dependent.id) ?? 0) - 1;
      indegree.set(dependent.id, remaining);
      if (remaining === 0) {
        ready.push(dependent);
        ready.sort(compareMigrations);
      }
    }
  }

  if (order.length !== selected.length) {
    const cycle = findCycle(selected, byId);
    throw new ContentMigrationRegistryError(
      "dependency-cycle",
      `Migration dependency cycle detected: ${cycle.join(" -> ")}`,
    );
  }
  return Object.freeze(order);
}

export function findCycle(
  selected: readonly ContentMigration[],
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
): string[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    const current = state.get(id);
    if (current === "visiting") {
      const index = stack.indexOf(id);
      return [...stack.slice(index), id];
    }
    if (current === "visited") return undefined;
    state.set(id, "visiting");
    stack.push(id);
    const migration = latestRegistered(byId, id);
    for (const dependency of migration?.dependsOn ?? []) {
      if (!byId.has(dependency)) continue;
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "visited");
    return undefined;
  };
  for (const migration of selected) {
    const cycle = visit(migration.id);
    if (cycle) return cycle;
  }
  return selected.map((migration) => migration.id);
}

export function addWithDependencies(
  id: string,
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
  result: Set<string>,
): void {
  if (result.has(id)) return;
  result.add(id);
  const migration = latestRegistered(byId, id);
  for (const dependency of migration?.dependsOn ?? [])
    addWithDependencies(dependency, byId, result);
}

export function latestRegistered(
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
  id: string,
): ContentMigration | undefined {
  const versions = byId.get(id);
  return versions?.[versions.length - 1];
}

export function compareMigrations(
  left: ContentMigration,
  right: ContentMigration,
): number {
  return left.id.localeCompare(right.id) || left.version - right.version;
}
