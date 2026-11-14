import fs from "node:fs";
import { executeFixtureCommand } from "./plugin_contract_exec.js";
import { pass } from "./plugin_contract_results.js";
import type {
  PackageManifest,
  PluginContractFixture,
  PluginContractLevel,
  PluginContractResult,
} from "./plugin_contract_types.js";

export function findTrustedFixture(
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

export function verifyFixture(
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

export function isSameDirectory(left: string, right: string): boolean {
  try {
    return fs.realpathSync(left) === fs.realpathSync(right);
  } catch {
    return false;
  }
}
