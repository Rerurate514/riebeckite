import fs from "node:fs";
import path from "node:path";
import {
  findTrustedFixture,
  verifyFixture,
} from "./plugin_contract_fixture.js";
import {
  inferCapabilities,
  verifyDeclaredCapabilities,
  verifyManifest,
  verifyPackedManifest,
} from "./plugin_contract_manifest.js";
import type {
  PackageManifest,
  PluginContractReport,
  VerifyPluginContractOptions,
} from "./plugin_contract_types.js";

export type {
  PluginContractCapability,
  PluginContractFixture,
  PluginContractFixtureCommand,
  PluginContractLevel,
  PluginContractReport,
  PluginContractResult,
  PluginContractStatus,
  VerifyPluginContractOptions,
} from "./plugin_contract_types.js";

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
