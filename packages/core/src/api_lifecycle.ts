export type ApiLifecycleStatus = "stable" | "deprecated" | "removed";

export type ApiLifecycleKind =
  | "function"
  | "class"
  | "type"
  | "interface"
  | "constant"
  | "config-key"
  | "plugin-option"
  | "plugin-hook"
  | "cli-command"
  | "cli-flag"
  | "integration";

export type ApiLifecycleDefinition = {
  readonly id: string;
  readonly kind: ApiLifecycleKind;
  readonly status: ApiLifecycleStatus;
  readonly package?: string;
  readonly deprecatedSince?: string;
  readonly removalVersion?: string;
  readonly replacement?: string;
  readonly reason?: string;
  readonly migrationGuide?: string;
  readonly summary?: string;
  readonly diagnosticCode?: string;
  readonly configPath?: string;
  readonly pluginOption?: {
    readonly plugin: string;
    readonly option: string;
  };
};

export type ApiLifecycleValidationIssue = {
  readonly apiId?: string;
  readonly code:
    | "invalid-id"
    | "invalid-kind"
    | "invalid-status"
    | "duplicate-id"
    | "missing-deprecated-since"
    | "missing-reason"
    | "invalid-version"
    | "removal-not-after-deprecation"
    | "missing-removal-version"
    | "unexpected-lifecycle-metadata"
    | "invalid-replacement"
    | "invalid-migration-guide"
    | "invalid-diagnostic-code"
    | "invalid-package";
  readonly message: string;
};

export type ApiLifecycleRegistry = {
  readonly entries: readonly ApiLifecycleDefinition[];
  readonly issues: readonly ApiLifecycleValidationIssue[];
  get(id: string): ApiLifecycleDefinition | undefined;
  deprecated(): readonly ApiLifecycleDefinition[];
};

export type ApiLifecycleConfig = {
  readonly plugins: readonly {
    readonly apiLifecycle?: readonly ApiLifecycleDefinition[];
  }[];
};

export const API_LIFECYCLE_DIAGNOSTIC_CODE = "RB-API-001";
export const API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE = "RB-API-002";

const lifecycleStatuses: readonly ApiLifecycleStatus[] = [
  "stable",
  "deprecated",
  "removed",
];

const lifecycleKinds: readonly ApiLifecycleKind[] = [
  "function",
  "class",
  "type",
  "interface",
  "constant",
  "config-key",
  "plugin-option",
  "plugin-hook",
  "cli-command",
  "cli-flag",
  "integration",
];

const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const diagnosticCodePattern = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;

export class ApiLifecycleValidationError extends Error {
  readonly issues: readonly ApiLifecycleValidationIssue[];

  constructor(issues: readonly ApiLifecycleValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "ApiLifecycleValidationError";
    this.issues = issues;
  }
}

export function defineApiLifecycle(
  definition: ApiLifecycleDefinition,
): ApiLifecycleDefinition {
  const issues = validateApiLifecycleDefinition(definition);
  if (issues.length > 0) throw new ApiLifecycleValidationError(issues);
  return Object.freeze({ ...definition });
}

export function validateApiLifecycleDefinition(
  definition: ApiLifecycleDefinition,
): readonly ApiLifecycleValidationIssue[] {
  const issues: ApiLifecycleValidationIssue[] = [];
  const apiId = definition.id;
  const issue = (
    code: ApiLifecycleValidationIssue["code"],
    message: string,
  ) => {
    issues.push({ apiId, code, message });
  };

  if (
    typeof apiId !== "string" ||
    apiId.length === 0 ||
    apiId.includes("#") === false ||
    /\s/.test(apiId) ||
    apiId.startsWith("#") ||
    apiId.endsWith("#")
  ) {
    issue(
      "invalid-id",
      `API lifecycle ID "${String(apiId)}" must use the form "<package>#<api>".`,
    );
  }

  if (!lifecycleKinds.includes(definition.kind)) {
    issue(
      "invalid-kind",
      `API lifecycle kind "${definition.kind}" is invalid.`,
    );
  }

  if (!lifecycleStatuses.includes(definition.status)) {
    issue(
      "invalid-status",
      `API lifecycle status "${definition.status}" is invalid.`,
    );
  }

  if (definition.package !== undefined && definition.package.trim() === "") {
    issue("invalid-package", "API lifecycle package must not be empty.");
  }

  if (definition.status === "stable") {
    if (
      definition.deprecatedSince !== undefined ||
      definition.removalVersion !== undefined
    ) {
      issue(
        "unexpected-lifecycle-metadata",
        `Stable API "${apiId}" must not declare deprecation or removal versions.`,
      );
    }
  }

  if (definition.status === "deprecated") {
    if (definition.deprecatedSince === undefined) {
      issue(
        "missing-deprecated-since",
        `Deprecated API "${apiId}" must declare deprecatedSince.`,
      );
    } else if (!parseSemver(definition.deprecatedSince)) {
      issue(
        "invalid-version",
        `deprecatedSince "${definition.deprecatedSince}" is not a valid version.`,
      );
    }

    if (definition.reason === undefined || definition.reason.trim() === "") {
      issue(
        "missing-reason",
        `Deprecated API "${apiId}" must declare a reason.`,
      );
    }

    if (definition.removalVersion !== undefined) {
      if (!parseSemver(definition.removalVersion)) {
        issue(
          "invalid-version",
          `removalVersion "${definition.removalVersion}" is not a valid version.`,
        );
      } else if (
        definition.deprecatedSince !== undefined &&
        parseSemver(definition.deprecatedSince) &&
        compareSemver(definition.removalVersion, definition.deprecatedSince) <=
          0
      ) {
        issue(
          "removal-not-after-deprecation",
          `Removal version "${definition.removalVersion}" must be greater than deprecatedSince "${definition.deprecatedSince}".`,
        );
      }
    }
  }

  if (definition.status === "removed") {
    if (definition.removalVersion === undefined) {
      issue(
        "missing-removal-version",
        `Removed API "${apiId}" must declare removalVersion.`,
      );
    } else if (!parseSemver(definition.removalVersion)) {
      issue(
        "invalid-version",
        `removalVersion "${definition.removalVersion}" is not a valid version.`,
      );
    }

    if (definition.reason === undefined || definition.reason.trim() === "") {
      issue("missing-reason", `Removed API "${apiId}" must declare a reason.`);
    }
  }

  if (
    definition.replacement !== undefined &&
    (definition.replacement.trim() === "" || definition.replacement === apiId)
  ) {
    issue(
      "invalid-replacement",
      `Replacement for "${apiId}" must name a different API.`,
    );
  }

  if (
    definition.migrationGuide !== undefined &&
    definition.migrationGuide.trim() === ""
  ) {
    issue(
      "invalid-migration-guide",
      `Migration guide for "${apiId}" must not be empty.`,
    );
  }

  if (
    definition.diagnosticCode !== undefined &&
    !diagnosticCodePattern.test(definition.diagnosticCode)
  ) {
    issue(
      "invalid-diagnostic-code",
      `Diagnostic code "${definition.diagnosticCode}" must be a stable uppercase code.`,
    );
  }

  return Object.freeze(issues);
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

type ParsedSemver = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | undefined;
};

function parseSemver(version: string): ParsedSemver | undefined {
  const match = semverPattern.exec(version);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

function compareSemver(left: string, right: string): number {
  const leftVersion = parseSemver(left);
  const rightVersion = parseSemver(right);
  if (!leftVersion || !rightVersion) return 0;
  const core =
    leftVersion.major - rightVersion.major ||
    leftVersion.minor - rightVersion.minor ||
    leftVersion.patch - rightVersion.patch;
  if (core !== 0) return core;
  if (leftVersion.prerelease === rightVersion.prerelease) return 0;
  if (leftVersion.prerelease === undefined) return 1;
  if (rightVersion.prerelease === undefined) return -1;
  return leftVersion.prerelease.localeCompare(rightVersion.prerelease);
}
