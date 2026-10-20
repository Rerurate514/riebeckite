import type { OutputDependency } from "../types/output_dependency.js";
import type { OutputDescriptor } from "./output_dependency.js";

export type OutputPlanOwner =
  | "content"
  | "plugin"
  | "hono-static-route"
  | "vite-client-asset"
  | "site-public-asset"
  | "unknown";

export type OutputPlanKind =
  | "content"
  | "redirect"
  | "plugin-page"
  | "generated"
  | "hono-static-route"
  | "asset"
  | "unknown";

export type OutputPlanAction = "generate" | "reuse" | "remove" | "unknown";

export type OutputPlanEntry = {
  readonly path: string;
  readonly owner: OutputPlanOwner;
  readonly kind: OutputPlanKind;
  readonly source: string;
  readonly dependencies: readonly OutputDependency[];
  readonly publicationEligible: boolean;
  readonly cacheEligible: boolean;
  readonly expectedToExist: boolean;
  readonly action: OutputPlanAction;
};

export type OutputPlanConflict = {
  readonly path: string;
  readonly owners: readonly OutputPlanOwner[];
};

export type OutputPlan = {
  readonly entries: readonly OutputPlanEntry[];
  readonly conflicts: readonly OutputPlanConflict[];
  readonly unknownPaths: readonly string[];
};

export type OutputPlanComparison = {
  readonly matched: readonly string[];
  readonly missingInPlan: readonly string[];
  readonly missingInDist: readonly string[];
  readonly ownerConflicts: readonly OutputPlanConflict[];
  readonly unknown: readonly string[];
  readonly publicationViolations: readonly string[];
};

export type OutputPlanInput = {
  readonly inventory: readonly OutputDescriptor[];
  readonly affectedPaths?: ReadonlySet<string>;
  readonly removed?: readonly OutputDescriptor[];
  readonly cacheAvailable?: boolean;
  readonly honoStaticRoutePaths?: ReadonlySet<string>;
  readonly viteClientAssetPaths?: ReadonlySet<string>;
  readonly sitePublicAssetPaths?: ReadonlySet<string>;
  readonly actualPaths?: Iterable<string>;
};

export function buildOutputPlan(input: OutputPlanInput): OutputPlan {
  const candidates: OutputPlanEntry[] = [
    ...input.inventory.map((output) => inventoryEntry(output, input)),
    ...(input.removed ?? []).map(removedEntry),
    ...entriesForPaths(
      input.honoStaticRoutePaths,
      "hono-static-route",
      "hono-static-route",
      "route",
    ),
    ...entriesForPaths(
      input.viteClientAssetPaths,
      "vite-client-asset",
      "asset",
      "client",
    ),
    ...entriesForPaths(
      input.sitePublicAssetPaths,
      "site-public-asset",
      "asset",
      "public",
    ),
  ];
  const plannedPaths = new Set(candidates.map((entry) => entry.path));
  for (const path of input.actualPaths ?? []) {
    if (plannedPaths.has(path)) continue;
    candidates.push({
      path,
      owner: "unknown",
      kind: "unknown",
      source: "observed:dist",
      dependencies: [{ type: "unknown" }],
      publicationEligible: false,
      cacheEligible: false,
      expectedToExist: true,
      action: "unknown",
    });
  }
  const byPath = new Map<string, OutputPlanEntry[]>();
  for (const candidate of candidates) {
    const existing = byPath.get(candidate.path) ?? [];
    existing.push(candidate);
    byPath.set(candidate.path, existing);
  }
  const conflicts = [...byPath.entries()]
    .filter(
      ([, entries]) => new Set(entries.map((entry) => entry.owner)).size > 1,
    )
    .map(([path, entries]) => ({
      path,
      owners: [...new Set(entries.map((entry) => entry.owner))].sort(),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const entries = [...byPath.values()]
    .map((samePathEntries) => samePathEntries[0])
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    entries,
    conflicts,
    unknownPaths: entries
      .filter((entry) => entry.owner === "unknown")
      .map((entry) => entry.path),
  };
}

export function compareOutputPlan(
  plan: OutputPlan,
  actualPaths: Iterable<string>,
): OutputPlanComparison {
  const actual = new Set(actualPaths);
  const entries = new Map(plan.entries.map((entry) => [entry.path, entry]));
  const missingInPlan = [...actual]
    .filter((path) => {
      const entry = entries.get(path);
      return entry === undefined || entry.owner === "unknown";
    })
    .sort();
  const missingInDist = plan.entries
    .filter((entry) => entry.expectedToExist && !actual.has(entry.path))
    .map((entry) => entry.path)
    .sort();
  const publicationViolations = plan.entries
    .filter(
      (entry) =>
        entry.owner !== "unknown" &&
        !entry.publicationEligible &&
        actual.has(entry.path),
    )
    .map((entry) => entry.path)
    .sort();
  const unknown = plan.entries
    .filter((entry) => entry.owner === "unknown")
    .map((entry) => entry.path);
  const matched = plan.entries
    .filter(
      (entry) =>
        entry.owner !== "unknown" &&
        entry.expectedToExist &&
        actual.has(entry.path),
    )
    .map((entry) => entry.path);
  return {
    matched,
    missingInPlan,
    missingInDist,
    ownerConflicts: plan.conflicts,
    unknown,
    publicationViolations,
  };
}

function inventoryEntry(
  output: OutputDescriptor,
  input: OutputPlanInput,
): OutputPlanEntry {
  const affected = input.affectedPaths?.has(output.path) ?? true;
  const cacheAvailable = input.cacheAvailable ?? false;
  return {
    path: output.path,
    owner: output.producer.startsWith("content:") ? "content" : "plugin",
    kind: output.kind,
    source: output.producer,
    dependencies: output.dependencies,
    publicationEligible: true,
    cacheEligible: true,
    expectedToExist: true,
    action: affected || !cacheAvailable ? "generate" : "reuse",
  };
}

function removedEntry(output: OutputDescriptor): OutputPlanEntry {
  return {
    path: output.path,
    owner: output.producer.startsWith("content:") ? "content" : "plugin",
    kind: output.kind,
    source: output.producer,
    dependencies: output.dependencies,
    publicationEligible: false,
    cacheEligible: false,
    expectedToExist: false,
    action: "remove",
  };
}

function entriesForPaths(
  paths: ReadonlySet<string> | undefined,
  owner: OutputPlanOwner,
  kind: OutputPlanKind,
  sourceKind: string,
): readonly OutputPlanEntry[] {
  return [...(paths ?? [])].map((path) => ({
    path,
    owner,
    kind,
    source: `${sourceKind}:${path}`,
    dependencies: [{ type: "unknown" }],
    publicationEligible: true,
    cacheEligible: false,
    expectedToExist: true,
    action: "unknown",
  }));
}
