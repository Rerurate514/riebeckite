import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { scenarioNames } from "./lib.mjs";
import { listArg, parseArgs, positiveIntegerArg } from "./runner_report.mjs";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const appRoot = path.join(root, "website");
export const appRequire = createRequire(path.join(appRoot, "package.json"));
export const execFileAsync = promisify(execFile);
export const args = parseArgs(process.argv.slice(2));
export const presets = listArg(args.presets) ?? ["starter", "showcase"];
export const sizes = (listArg(args.sizes) ?? ["100", "1000"]).map(Number);
export const scenarios = listArg(args.scenarios) ?? scenarioNames;
export const runs = positiveIntegerArg(args.runs, 1, "runs");
export const metricsEnabled = args.metrics !== "false";
export const retainOutputs = args.retainOutputs === "true";
export const workRoot = path.resolve(
  args.workRoot ?? path.join(appRoot, ".riebeckite", "preset-ssg-benchmark"),
);
export const resultsDirectory = path.resolve(
  args.out ?? path.join(root, "benchmarks", "results"),
);
export const stamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
export const jsonPath = args.resume
  ? path.resolve(args.resume)
  : path.join(resultsDirectory, `${stamp}-preset-ssg.json`);
export const markdownPath = jsonPath.replace(/\.json$/u, ".md");
