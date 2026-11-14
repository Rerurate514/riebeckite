import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze } from "./check_source_health_analyze.mjs";
import { collectSourceFiles } from "./check_source_health_files.mjs";
import { reportSizes } from "./check_source_health_report.mjs";
import { isBrowserFile } from "./check_source_health_rules.mjs";

export { analyze, isBrowserFile };

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const files = collectSourceFiles();
  const { records, functions, errors, warnings } = analyze(files);

  reportSizes(records, functions, errors, warnings);

  if (errors.length > 0) process.exitCode = 1;
}
