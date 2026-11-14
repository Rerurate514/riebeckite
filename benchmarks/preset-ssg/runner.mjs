import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { localizationScenarioNames, scenarioNames } from "./lib.mjs";
import { buildOnce } from "./runner_build_once.mjs";
import {
  args,
  jsonPath,
  markdownPath,
  presets,
  resultsDirectory,
  root,
  runs,
  scenarios,
  sizes,
} from "./runner_config.mjs";
import { writeReport } from "./runner_report.mjs";
import { runScenario } from "./runner_scenario.mjs";
import { buildWorkspacePackages } from "./runner_site.mjs";

if (args.buildOnce) {
  process.stdout.write(
    `${JSON.stringify(await buildOnce(JSON.parse(args.buildOnce)))}\n`,
  );
  process.exit(0);
}

const { scaffoldPresets } = await import(
  pathToFileURL(
    path.join(root, "packages/create-riebeckite/src/scaffold/presets.ts"),
  )
);
const rows = args.resume
  ? JSON.parse(await fs.readFile(jsonPath, "utf8")).rows
  : [];
if (!Array.isArray(rows))
  throw new Error(`Invalid benchmark report: ${jsonPath}`);
await fs.mkdir(resultsDirectory, { recursive: true });
let workspaceBuilt = false;
for (const preset of presets) {
  if (!(preset in scaffoldPresets))
    throw new Error(`Unknown official preset: ${preset}`);
  for (const size of sizes) {
    for (const scenario of scenarios) {
      if (
        !scenarioNames.includes(scenario) &&
        !localizationScenarioNames.includes(scenario)
      )
        throw new Error(`Unknown scenario: ${scenario}`);
      if (
        rows.some(
          (row) =>
            row.preset === preset &&
            row.size === size &&
            row.scenario === scenario,
        )
      ) {
        process.stdout.write(
          `Skipping completed ${preset}/${size}/${scenario}\n`,
        );
        continue;
      }
      if (!workspaceBuilt) {
        if (process.env.RIEBECKITE_BENCHMARK_SKIP_BUILD !== "1") {
          await buildWorkspacePackages();
        }
        workspaceBuilt = true;
      }
      const result = await runScenario({ preset, size, scenario, runs });
      rows.push(result);
      await writeReport(rows);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  }
}
process.stdout.write(`Saved ${jsonPath}\nSaved ${markdownPath}\n`);
