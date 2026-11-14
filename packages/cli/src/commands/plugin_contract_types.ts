export type PluginContractLevel = "basic" | "integration" | "full";

export type PluginContractStatus =
  | "PASS"
  | "FAIL"
  | "SKIP"
  | "UNSUPPORTED"
  | "UNVERIFIED";

export type PluginContractCapability =
  | "package"
  | "plugin"
  | "markdown"
  | "client"
  | "publication";

export type PluginContractResult = {
  readonly contract: string;
  readonly status: PluginContractStatus;
  readonly expected: string;
  readonly actual: string;
  readonly guidance?: string;
  readonly executed: boolean;
};

export type PluginContractFixtureCommand = {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly browser?: boolean;
};

export type PluginContractFixture = {
  readonly packageName: string;
  readonly packageDirectory: string;
  readonly integration: PluginContractFixtureCommand;
  readonly full?: PluginContractFixtureCommand;
};

export type PluginContractReport = {
  readonly packagePath: string;
  readonly packageName: string;
  readonly level: PluginContractLevel;
  readonly capabilities: readonly PluginContractCapability[];
  readonly results: readonly PluginContractResult[];
  readonly passed: boolean;
  readonly complete: boolean;
};

export type VerifyPluginContractOptions = {
  readonly level?: PluginContractLevel;
  readonly capabilities?: readonly PluginContractCapability[];
  readonly fixtures?: readonly PluginContractFixture[];
};

export type PackageManifest = {
  readonly name?: unknown;
  readonly exports?: unknown;
  readonly files?: unknown;
  readonly scripts?: unknown;
  readonly types?: unknown;
};

export type ExportTarget =
  | string
  | { readonly import?: unknown; readonly types?: unknown };
