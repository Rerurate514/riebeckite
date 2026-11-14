import { compareSemver, parseSemver } from "./api_lifecycle_semver.js";
import type {
  ApiLifecycleDefinition,
  ApiLifecycleKind,
  ApiLifecycleStatus,
  ApiLifecycleValidationIssue,
} from "./api_lifecycle_types.js";

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

export class ApiLifecycleValidationError extends Error {
  readonly issues: readonly ApiLifecycleValidationIssue[];

  constructor(issues: readonly ApiLifecycleValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "ApiLifecycleValidationError";
    this.issues = issues;
  }
}

const diagnosticCodePattern = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;

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
