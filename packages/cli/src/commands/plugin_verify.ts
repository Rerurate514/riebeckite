import {
  formatPluginContractReport,
  type PluginContractLevel,
  verifyPluginContract,
} from "@riebeckite/test/plugin-contract";
import { repositoryPluginContractFixtures } from "./plugin_contract_fixtures.js";

export type PluginVerifyOptions = {
  readonly pluginPath: string;
  readonly level: PluginContractLevel;
  readonly json: boolean;
};

export function runPluginVerify(options: PluginVerifyOptions): boolean {
  const report = verifyPluginContract(options.pluginPath, {
    level: options.level,
    fixtures: repositoryPluginContractFixtures(process.cwd()),
  });
  console.log(
    options.json
      ? JSON.stringify(report, null, 2)
      : formatPluginContractReport(report),
  );
  return report.passed && report.complete;
}
