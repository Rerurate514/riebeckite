import {
  ApiLifecycleValidationError,
  validateApiLifecycleDefinition,
} from "./api_lifecycle_validation.js";

export {
  ApiLifecycleValidationError,
  validateApiLifecycleDefinition,
} from "./api_lifecycle_validation.js";

import type {
  ApiLifecycleConfig,
  ApiLifecycleDefinition,
  ApiLifecycleRegistry,
  ApiLifecycleValidationIssue,
} from "./api_lifecycle_types.js";

export function defineApiLifecycle(
  definition: ApiLifecycleDefinition,
): ApiLifecycleDefinition {
  const issues = validateApiLifecycleDefinition(definition);
  if (issues.length > 0) throw new ApiLifecycleValidationError(issues);
  return Object.freeze({ ...definition });
}

export function createApiLifecycleRegistry(
  definitions: readonly ApiLifecycleDefinition[] = [],
): ApiLifecycleRegistry {
  const entries: ApiLifecycleDefinition[] = [];
  const issues: ApiLifecycleValidationIssue[] = [];
  const seen = new Set<string>();

  for (const definition of definitions) {
    const definitionIssues = validateApiLifecycleDefinition(definition);
    if (definitionIssues.length > 0) {
      issues.push(...definitionIssues);
      continue;
    }
    if (seen.has(definition.id)) {
      issues.push({
        apiId: definition.id,
        code: "duplicate-id",
        message: `API lifecycle ID "${definition.id}" is registered more than once.`,
      });
      continue;
    }
    seen.add(definition.id);
    entries.push(Object.freeze({ ...definition }));
  }

  const frozenEntries = Object.freeze(entries);
  const frozenIssues = Object.freeze(issues);
  const byId = new Map(frozenEntries.map((entry) => [entry.id, entry]));

  return Object.freeze({
    entries: frozenEntries,
    issues: frozenIssues,
    get: (id: string) => byId.get(id),
    deprecated: () =>
      frozenEntries.filter((entry) => entry.status === "deprecated"),
  });
}

export const builtInApiLifecycle: readonly ApiLifecycleDefinition[] =
  Object.freeze([
    Object.freeze({
      id: "@riebeckite/core#defineApiLifecycle",
      kind: "function" as const,
      status: "stable" as const,
      package: "@riebeckite/core",
      summary: "Define lifecycle metadata for a public API.",
    }),
    Object.freeze({
      id: "@riebeckite/core#createApiLifecycleRegistry",
      kind: "function" as const,
      status: "stable" as const,
      package: "@riebeckite/core",
      summary: "Create a validated registry of API lifecycle definitions.",
    }),
    Object.freeze({
      id: "@riebeckite/core#resolveApiLifecycle",
      kind: "function" as const,
      status: "stable" as const,
      package: "@riebeckite/core",
      summary: "Resolve lifecycle definitions from the project configuration.",
    }),
  ]);

export function collectApiLifecycleDefinitions(
  config: ApiLifecycleConfig,
  additional: readonly ApiLifecycleDefinition[] = [],
): readonly ApiLifecycleDefinition[] {
  return [
    ...builtInApiLifecycle,
    ...config.plugins.flatMap((plugin) => plugin.apiLifecycle ?? []),
    ...additional,
  ];
}

export function resolveApiLifecycle(
  config: ApiLifecycleConfig,
  additional: readonly ApiLifecycleDefinition[] = [],
): ApiLifecycleRegistry {
  return createApiLifecycleRegistry(
    collectApiLifecycleDefinitions(config, additional),
  );
}

const apiLifecycleConfigSource = Symbol.for(
  "@riebeckite/core/api-lifecycle-source",
);

export function attachApiLifecycleConfigSource(
  resolved: object,
  source: unknown,
): void {
  Object.defineProperty(resolved, apiLifecycleConfigSource, {
    value: source,
    enumerable: true,
    configurable: true,
  });
}

export function getApiLifecycleConfigSource(config: object): unknown {
  return (config as { [apiLifecycleConfigSource]?: unknown })[
    apiLifecycleConfigSource
  ];
}

export function hasApiLifecycleConfigPath(
  source: unknown,
  configPath: string,
): boolean {
  if (typeof source !== "object" || source === null) return false;
  let current: unknown = source;
  for (const segment of configPath.split(".")) {
    if (
      typeof current !== "object" ||
      current === null ||
      Object.hasOwn(current, segment) === false
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
}

export type {
  ApiLifecycleConfig,
  ApiLifecycleDefinition,
  ApiLifecycleKind,
  ApiLifecycleRegistry,
  ApiLifecycleStatus,
  ApiLifecycleValidationIssue,
} from "./api_lifecycle_types.js";

export {
  API_LIFECYCLE_DIAGNOSTIC_CODE,
  API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE,
} from "./api_lifecycle_types.js";
