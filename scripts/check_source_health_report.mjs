import { formatFinding } from "./check_source_health_analyze.mjs";
import {
  fileStrongWarningLines,
  fileWarningLines,
  functionWarningLines,
} from "./check_source_health_config.mjs";

export function reportSizes(records, functions, errors, warnings) {
  const largeFiles = records
    .filter((record) => record.lines >= fileWarningLines)
    .sort((left, right) => right.lines - left.lines);
  const longFunctions = functions
    .filter((fn) => fn.lines >= functionWarningLines)
    .sort((left, right) => right.lines - left.lines);

  for (const record of largeFiles) {
    const strong = record.lines >= fileStrongWarningLines;
    warnings.push(
      formatFinding(
        strong ? "strong-warning" : "warning",
        `${record.path}: ${record.lines} lines${strong ? " (split review required)" : ""}`,
      ),
    );
  }
  for (const fn of longFunctions.slice(0, 30)) {
    warnings.push(
      formatFinding(
        "warning",
        `${fn.path}:${fn.start} ${fn.name}: ${fn.lines} lines`,
      ),
    );
  }

  console.log(
    `Source health: ${records.length} files, ${records.reduce((sum, record) => sum + record.lines, 0)} lines, ${functions.length} functions.`,
  );
  console.log(
    `Size signals: ${largeFiles.length} file(s) >= ${fileWarningLines} lines, ${largeFiles.filter((record) => record.lines >= fileStrongWarningLines).length} >= ${fileStrongWarningLines}, ${longFunctions.length} function(s) >= ${functionWarningLines} lines.`,
  );
  if (warnings.length > 0) {
    console.log(`\nAdvisory findings (${warnings.length}):`);
    for (const warning of warnings) console.log(warning);
  }
  if (errors.length > 0) {
    console.error(`\nArchitecture errors (${errors.length}):`);
    for (const error of errors) console.error(error);
  }
}
