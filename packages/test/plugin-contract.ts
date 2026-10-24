import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "./e2e/process.js";

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
};

export type PluginContractReport = {
  readonly packagePath: string;
  readonly packageName: string;
  readonly level: PluginContractLevel;
  readonly capabilities: readonly PluginContractCapability[];
  readonly results: readonly PluginContractResult[];
  readonly passed: boolean;
};

export type VerifyPluginContractOptions = {
  readonly level?: PluginContractLevel;
  readonly capabilities?: readonly PluginContractCapability[];
};

type PackageManifest = {
  readonly name?: unknown;
  readonly exports?: unknown;
  readonly files?: unknown;
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
  const results = [
    ...verifyManifest(root, manifest),
    ...verifyDeclaredCapabilities(manifest, capabilities, level),
    ...(level === "full" ? verifyPackedManifest(root) : []),
  ];
  return {
    packagePath: root,
    packageName,
    level,
    capabilities,
    results,
    passed: results.every((result) => result.status !== "FAIL"),
  };
}

export function formatPluginContractReport(
  report: PluginContractReport,
): string {
  const lines = [
    `Plugin Contract Lab: ${report.packageName}`,
    `level: ${report.level}; capabilities: ${report.capabilities.join(", ")}`,
  ];
  for (const result of report.results) {
    lines.push(
      `${result.status.padEnd(11)} ${result.contract}: expected ${result.expected}; actual ${result.actual}`,
    );
    if (result.guidance) lines.push(`             ${result.guidance}`);
  }
  lines.push(
    report.passed
      ? "Verification completed without contract failures."
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
      actual: "no fixture declaration",
      guidance:
        "Add a focused plugin test or run the site integration that exercises this capability.",
    });
  }
  if (level !== "basic" && !capabilities.includes("plugin")) {
    results.push({
      contract: "plugin.runtime",
      status: "UNSUPPORTED",
      expected: "a plugin factory fixture",
      actual: "package metadata cannot safely execute arbitrary plugin code",
      guidance:
        "Use a repository-owned integration fixture; the verifier does not sandbox third-party code.",
    });
  }
  return results;
}

function verifyPackedManifest(root: string): PluginContractResult[] {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-plugin-contract-"),
  );
  try {
    const packed = run(
      "pnpm",
      ["--config.ignore-scripts=true", "pack", "--pack-destination", temp],
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
    return missing.length === 0
      ? [
          pass(
            "package.tarball",
            "package.json and dist/ in npm pack output",
            "present",
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
  return { contract, status: "PASS", expected, actual };
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
  };
}
