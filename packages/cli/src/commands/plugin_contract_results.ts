import type { PluginContractResult } from "./plugin_contract_types.js";

export function pass(
  contract: string,
  expected: string,
  actual: string,
): PluginContractResult {
  return { contract, status: "PASS", expected, actual, executed: true };
}

export function fail(
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
