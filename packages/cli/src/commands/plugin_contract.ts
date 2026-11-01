import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "./e2e/index.js";

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

type PackageManifest = {
  readonly name?: unknown;
  readonly exports?: unknown;
  readonly files?: unknown;
  readonly scripts?: unknown;
  readonly types?: unknown;
};

type ExportTarget =
  | string
  | { readonly import?: unknown; readonly types?: unknown };

export function verifyPluginContract(
  packagePath: string,
  options: VerifyPluginContractOptions = {},
): PluginContractReport {
  const level = options.level ?? "basic";
  const root = fs.realpathSync(packagePath);
  const manifestPath = path.join(root, "package.json");
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as PackageManifest;
  const packageName =
    typeof manifest.name === "string" ? manifest.name : "(unnamed package)";
  const capabilities = options.capabilities ?? inferCapabilities(manifest);
  const fixture = findTrustedFixture(root, manifest, options.fixtures ?? []);
  const results = [
    ...verifyManifest(root, manifest),
    ...verifyDeclaredCapabilities(
      manifest,
      capabilities,
      level,
      fixture !== null,
    ),
    ...verifyFixture(manifest, fixture, options.fixtures ?? [], level),
    ...(level === "full" ? verifyPackedManifest(root, manifest) : []),
  ];
  const passed = results.every((result) => result.status !== "FAIL");
  return {
    packagePath: root,
    packageName,
    level,
    capabilities,
    results,
    passed,
    complete:
      passed &&
      results.every(
        (result) =>
          result.status !== "UNVERIFIED" && result.status !== "UNSUPPORTED",
      ),
  };
}

export function formatPluginContractReport(
  report: PluginContractReport,
): string {
  const executed = report.results.filter((result) => result.executed).length;
  const failed = report.results.filter(
    (result) => result.status === "FAIL",
  ).length;
  const lines = [
    `Plugin Contract Lab: ${report.packageName}`,
    `level: ${report.level}; capabilities: ${report.capabilities.join(", ")}`,
    `executed: ${executed}; not executed: ${report.results.length - executed}; failed: ${failed}`,
  ];
  for (const result of report.results) {
    lines.push(
      `${result.status.padEnd(11)} ${result.contract}${result.executed ? "" : " (not executed)"}: expected ${result.expected}; actual ${result.actual}`,
    );
    if (result.guidance) lines.push(`             ${result.guidance}`);
  }
  lines.push(
    report.passed
      ? report.complete
        ? "Verification completed without contract failures."
        : "Verification incomplete: some requested contracts were not executed."
      : "Verification failed. Fix the failed contracts and rerun the same command.",
  );
  return lines.join("\n");
}

function inferCapabilities(
  manifest: PackageManifest,
): readonly PluginContractCapability[] {
  const exports = exportEntries(manifest.exports);
  return [
    "package",
    ...(exports.has("./client") || exports.has("./style.css")
      ? ["client" as const]
      : []),
  ];
}

function verifyManifest(
  root: string,
  manifest: PackageManifest,
): PluginContractResult[] {
  const results: PluginContractResult[] = [];
  const exports = exportEntries(manifest.exports);
  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    results.push(
      fail(
        "package.name",
        "a non-empty npm package name",
        String(manifest.name),
      ),
    );
  }
  if (!exports.has(".")) {
    results.push(fail("package.exports", 'a root "." export', "missing"));
    return results;
  }
  for (const [subpath, target] of exports) {
    const importPath = targetPath(target, "import");
    const typesPath = targetPath(target, "types");
    if (importPath === undefined && !subpath.endsWith(".css")) {
      results.push(fail(`exports.${subpath}`, "an import target", "missing"));
      continue;
    }
    for (const [kind, relative] of [
      ["import", importPath],
      ["types", typesPath],
    ] as const) {
      if (relative === undefined) continue;
      const targetPathname = path.resolve(root, relative);
      if (!isInside(root, targetPathname) || !fs.existsSync(targetPathname)) {
        results.push(
          fail(
            `exports.${subpath}.${kind}`,
            `an existing file inside the package`,
            relative,
          ),
        );
      }
    }
  }
  if (
    typeof manifest.types === "string" &&
    !fs.existsSync(path.join(root, manifest.types))
  ) {
    results.push(
      fail("package.types", "an existing declaration file", manifest.types),
    );
  }
  if (results.length === 0) {
    results.push(
      pass(
        "package.exports",
        "published exports and types exist",
        "all declared targets exist",
      ),
    );
  }
  return results;
}

function verifyDeclaredCapabilities(
  manifest: PackageManifest,
  capabilities: readonly PluginContractCapability[],
  level: PluginContractLevel,
  hasTrustedFixture: boolean,
): PluginContractResult[] {
  const exports = exportEntries(manifest.exports);
  const results: PluginContractResult[] = [];
  if (capabilities.includes("client")) {
    results.push(
      exports.has("./client")
        ? pass("client.entry", "a public ./client export", "declared")
        : fail("client.entry", "a public ./client export", "missing"),
    );
    results.push(
      exports.has("./style.css")
        ? pass("client.css", "a public ./style.css export", "declared")
        : fail("client.css", "a public ./style.css export", "missing"),
    );
  }
  for (const capability of capabilities) {
    if (capability === "package" || capability === "client") continue;
    results.push({
      contract: `${capability}.runtime`,
      status: level === "basic" ? "SKIP" : "UNVERIFIED",
      expected: "an explicit fixture supplied by the plugin author",
      actual: hasTrustedFixture
        ? "trusted fixture registered; capability-specific coverage is not declared"
        : "no fixture declaration",
      guidance:
        "Add a focused plugin test or run the site integration that exercises this capability.",
      executed: false,
    });
  }
  if (
    level !== "basic" &&
    !capabilities.includes("plugin") &&
    !hasTrustedFixture
  ) {
    results.push({
      contract: "plugin.runtime",
      status: "UNSUPPORTED",
      expected: "a plugin factory fixture",
      actual: "package metadata cannot safely execute arbitrary plugin code",
      guidance:
        "Register a repository-owned fixture; the verifier does not sandbox third-party code.",
      executed: false,
    });
  }
  return results;
}

function findTrustedFixture(
  root: string,
  manifest: PackageManifest,
  fixtures: readonly PluginContractFixture[],
): PluginContractFixture | null {
  if (typeof manifest.name !== "string") return null;
  return (
    fixtures.find(
      (fixture) =>
        fixture.packageName === manifest.name &&
        isSameDirectory(root, fixture.packageDirectory),
    ) ?? null
  );
}

function verifyFixture(
  manifest: PackageManifest,
  fixture: PluginContractFixture | null,
  fixtures: readonly PluginContractFixture[],
  level: PluginContractLevel,
): PluginContractResult[] {
  if (level === "basic") return [];
  const packageName =
    typeof manifest.name === "string" ? manifest.name : "(unnamed package)";
  if (!fixture) {
    const registeredByName = fixtures.some(
      (candidate) => candidate.packageName === packageName,
    );
    return [
      {
        contract: "fixture.registry",
        status: "UNVERIFIED",
        expected: `a trusted fixture registered for ${packageName} at this exact directory`,
        actual: registeredByName
          ? "a fixture is registered for a different package directory"
          : "no trusted fixture is registered",
        guidance:
          "The verifier runs only repository-owned fixtures registered for the exact package name and directory. No plugin code was executed.",
        executed: false,
      },
    ];
  }
  const fullCommand = level === "full" ? fixture.full : undefined;
  const useFull = fullCommand !== undefined;
  const command = fullCommand ?? fixture.integration;
  const contract = useFull ? "fixture.full" : "fixture.integration";
  const executed = executeFixtureCommand(contract, command);
  const results = [executed];
  if (level !== "full") return results;
  if (!useFull) {
    results.push({
      contract: "fixture.browser",
      status: "UNVERIFIED",
      expected: "a browser fixture command",
      actual: "no full fixture is registered",
      guidance:
        "Register a full fixture that runs browser assertions; integration output does not prove browser behavior.",
      executed: false,
    });
    return results;
  }
  if (!command.browser) {
    results.push({
      contract: "fixture.browser",
      status: "UNVERIFIED",
      expected: "a fixture command that runs a real browser",
      actual: "the full fixture is not marked as a browser fixture",
      guidance:
        "Mark the command as a browser fixture only when it launches a browser. A passing build is not browser verification.",
      executed: false,
    });
    return results;
  }
  results.push(
    executed.status === "PASS"
      ? pass(
          "fixture.browser",
          "trusted fixture browser assertions pass",
          "fixture ran browser assertions and exited 0",
        )
      : {
          contract: "fixture.browser",
          status: "FAIL",
          expected: "trusted fixture browser assertions pass",
          actual: "the full fixture command failed",
          guidance:
            "Inspect the fixture output. Browser behavior is not verified while the command fails.",
          executed: true,
        },
  );
  return results;
}

function executeFixtureCommand(
  contract: string,
  command: PluginContractFixtureCommand,
): PluginContractResult {
  try {
    const result = run(command.command, command.args, {
      cwd: command.cwd,
      allowFailure: true,
    });
    const output = [result.stdout, result.stderr]
      .map((text) => text.trim())
      .filter(Boolean)
      .join("\n");
    const commandLine = [command.command, ...command.args].join(" ");
    if (result.status === 0) {
      return pass(
        contract,
        `${commandLine} exits 0`,
        "trusted fixture command completed",
      );
    }
    return {
      contract,
      status: "FAIL",
      expected: `${commandLine} exits 0`,
      actual: `exit ${result.status}${output ? `\n${tail(output, 40)}` : ""}`,
      guidance: "Inspect the fixture output and rerun the same command.",
      executed: true,
    };
  } catch (error) {
    return {
      contract,
      status: "FAIL",
      expected: `${[command.command, ...command.args].join(" ")} exits 0`,
      actual: error instanceof Error ? error.message : String(error),
      guidance:
        "The trusted fixture could not start. Check the command and its working directory.",
      executed: false,
    };
  }
}

function tail(text: string, lines: number): string {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

function isSameDirectory(left: string, right: string): boolean {
  try {
    return fs.realpathSync(left) === fs.realpathSync(right);
  } catch {
    return false;
  }
}

function verifyPackedManifest(
  root: string,
  manifest: PackageManifest,
): PluginContractResult[] {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-plugin-contract-"),
  );
  try {
    const packed = run(
      "pnpm",
      [
        "--config.ignore-scripts=true",
        "--config.ignore-pnpmfile=true",
        "pack",
        "--pack-destination",
        temp,
      ],
      {
        cwd: root,
        allowFailure: true,
      },
    );
    if (packed.status !== 0) {
      return [
        fail(
          "package.pack",
          "pnpm pack succeeds",
          packed.stderr.trim() || packed.stdout.trim() || "pnpm pack failed",
        ),
      ];
    }
    const tarball = fs.readdirSync(temp).find((name) => name.endsWith(".tgz"));
    if (!tarball)
      return [fail("package.pack", "a .tgz tarball", "none produced")];
    const listed = run("tar", ["-tzf", path.join(temp, tarball)], {
      allowFailure: true,
    });
    if (listed.status !== 0)
      return [
        fail("package.tarball", "a readable tarball", listed.stderr.trim()),
      ];
    const files = new Set(listed.stdout.split(/\r?\n/));
    const missing = ["package/package.json", "package/dist/"].filter(
      (entry) =>
        ![...files].some((file) => file === entry || file.startsWith(entry)),
    );
    const lifecycleScripts = declaredPackScripts(manifest);
    return missing.length === 0
      ? [
          pass(
            "package.tarball",
            "package.json and dist/ in npm pack output",
            `present; lifecycle scripts disabled; pnpmfile disabled${
              lifecycleScripts.length > 0
                ? ` (${lifecycleScripts.join(", ")} declared)`
                : ""
            }`,
          ),
        ]
      : [
          fail(
            "package.tarball",
            "package.json and dist/ in npm pack output",
            `missing ${missing.join(", ")}`,
          ),
        ];
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function declaredPackScripts(manifest: PackageManifest): readonly string[] {
  if (
    typeof manifest.scripts !== "object" ||
    manifest.scripts === null ||
    Array.isArray(manifest.scripts)
  )
    return [];
  const scripts = manifest.scripts as Record<string, unknown>;
  return ["prepack", "prepare", "postpack"].filter(
    (name) => typeof scripts[name] === "string",
  );
}

function exportEntries(value: unknown): ReadonlyMap<string, ExportTarget> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return new Map();
  return new Map(
    Object.entries(value as Record<string, ExportTarget>).filter(
      ([key]) => key === "." || key.startsWith("./"),
    ),
  );
}

function targetPath(
  target: ExportTarget,
  condition: "import" | "types",
): string | undefined {
  if (typeof target === "string")
    return condition === "import" ? target : undefined;
  const value = target[condition];
  return typeof value === "string" ? value : undefined;
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function pass(
  contract: string,
  expected: string,
  actual: string,
): PluginContractResult {
  return { contract, status: "PASS", expected, actual, executed: true };
}

function fail(
  contract: string,
  expected: string,
  actual: string,
): PluginContractResult {
  return {
    contract,
    status: "FAIL",
    expected,
    actual,
    guidance: "Correct the package contract and rerun the command.",
    executed: true,
  };
}
