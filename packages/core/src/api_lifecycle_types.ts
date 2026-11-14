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
