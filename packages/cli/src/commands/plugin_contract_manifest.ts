import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "./plugin_contract_exec.js";
import { fail, pass } from "./plugin_contract_results.js";
import type {
  ExportTarget,
  PackageManifest,
  PluginContractCapability,
  PluginContractLevel,
  PluginContractResult,
} from "./plugin_contract_types.js";

export function inferCapabilities(
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

export function verifyManifest(
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

export function verifyDeclaredCapabilities(
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

export function verifyPackedManifest(
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

export function declaredPackScripts(
  manifest: PackageManifest,
): readonly string[] {
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

export function exportEntries(
  value: unknown,
): ReadonlyMap<string, ExportTarget> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return new Map();
  return new Map(
    Object.entries(value as Record<string, ExportTarget>).filter(
      ([key]) => key === "." || key.startsWith("./"),
    ),
  );
}

export function targetPath(
  target: ExportTarget,
  condition: "import" | "types",
): string | undefined {
  if (typeof target === "string")
    return condition === "import" ? target : undefined;
  const value = target[condition];
  return typeof value === "string" ? value : undefined;
}

export function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
