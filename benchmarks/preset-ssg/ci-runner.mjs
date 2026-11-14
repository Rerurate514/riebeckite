import fs from "node:fs/promises";
import {
  args,
  jsonPath,
  markdownPath,
  presets,
  resultsDirectory,
  runs,
  scenarios,
  sizes,
} from "./ci_runner_config.mjs";
import { compact, writeReport } from "./ci_runner_report.mjs";
import { runScenario } from "./ci_runner_scenario.mjs";
import { buildOnce, buildWorkspacePackages } from "./ci_runner_site.mjs";
import { localizationScenarioNames, scenarioNames } from "./lib.mjs";

if (args.buildOnce) {
  process.stdout.write(
    `${JSON.stringify(await buildOnce(JSON.parse(args.buildOnce)))}\n`,
  );
  process.exit(0);
}

const rows = [];
await fs.mkdir(resultsDirectory, { recursive: true });
let workspaceBuilt = false;
for (const preset of presets) {
  for (const size of sizes) {
    for (const scenario of scenarios) {
      if (
        !scenarioNames.includes(scenario) &&
        !localizationScenarioNames.includes(scenario)
      )
        throw new Error(`Unknown scenario: ${scenario}`);
      if (!workspaceBuilt && args.noBuildPackages !== "true") {
        await buildWorkspacePackages();
        workspaceBuilt = true;
      }
      const result = await runScenario({ preset, size, scenario, runs });
      rows.push(result);
      await writeReport(rows);
      process.stdout.write(`${JSON.stringify(compact(result))}\n`);
    }
  }
}
process.stdout.write(`Saved ${jsonPath}\nSaved ${markdownPath}\n`);
