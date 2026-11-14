export type Status = "PASS" | "FAIL" | "UNVERIFIED";

export type Verdict = "READY" | "REVIEW REQUIRED" | "BLOCKED" | "UNVERIFIED";

export type PackageManager = "npm" | "pnpm";

export type Check = {
  readonly name: string;
  readonly baseline: Status;
  readonly candidate: Status;
};

export type UpgradeReport = {
  readonly version: 1;
  readonly verdict: Verdict;
  readonly target: string;
  readonly packageManager?: PackageManager;
  readonly packages: readonly string[];
  readonly checks: readonly Check[];
  readonly diagnostics: {
    readonly baseline: Status;
    readonly candidate: Status;
  };
  readonly urls: {
    readonly added: readonly string[];
    readonly removed: readonly string[];
  };
  readonly output: {
    readonly added: readonly string[];
    readonly removed: readonly string[];
  };
  readonly notes: readonly string[];
};

export type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  readonly engines?: { readonly node?: string };
  readonly scripts?: Record<string, string>;
};
