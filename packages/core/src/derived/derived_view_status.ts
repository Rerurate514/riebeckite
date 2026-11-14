import type {
  DerivedView,
  DerivedViewExecution,
  DerivedViewStatus,
} from "./derived_view_types.js";

export function registryStatus(
  views: Map<string, DerivedView<unknown, unknown>>,
  pending: Map<string, unknown>,
): DerivedViewStatus[] {
  return [...views.values()]
    .map((view) => ({
      id: view.id,
      version: view.version,
      pending: [...pending.keys()].filter((key) =>
        key.startsWith(`${view.id}:`),
      ).length,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function registryInspection(
  views: Map<string, DerivedView<unknown, unknown>>,
  executions: Map<string, DerivedViewExecution>,
): DerivedViewExecution[] {
  return [...views.values()]
    .map(
      (view) =>
        executions.get(view.id) ?? {
          id: view.id,
          version: view.version,
          dependencies: [],
          cache: "not-run" as const,
          durationMs: 0,
        },
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}
