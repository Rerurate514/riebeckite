import path from "node:path";

import type { Logger } from "./logger.js";
import { type RunResult, run } from "./process.js";

export interface RunCliOptions {
  /** Absolute path to the installed CLI entry point. */
  cliEntry: string;
  /** Working directory for the invocation. */
  cwd: string;
  /** Name shown in the step line, e.g. `"riebeckite"`. */
  cliName: string;
  logger: Logger;
}

/**
 * Invoke an installed CLI entry with `args`, print its combined output, and
 * return the raw result. The step line reads `<cliName> <args...>`.
 */
export function runCli(
  args: readonly string[],
  options: RunCliOptions,
): RunResult {
  const { cliEntry, cwd, cliName, logger } = options;
  logger.step(`${cliName} ${args.join(" ")}`);
  const result = run(process.execPath, [cliEntry, ...args], { cwd });
  const output = cliText(result).trim();
  if (output) console.log(output);
  return result;
}

/** Combined stdout and stderr of a run. */
export function cliText(result: RunResult): string {
  return `${result.stdout}${result.stderr}`;
}

/**
 * Type-check the site with its locally installed TypeScript compiler. The
 * command matches `<typescript>/bin/tsc --noEmit -p <project>`.
 */
export function runTypecheck(
  siteDir: string,
  project: string,
  logger: Logger,
): RunResult {
  logger.step(`tsc --noEmit -p ${project}`);
  const tsc = path.join(siteDir, "node_modules", "typescript", "bin", "tsc");
  const result = run(process.execPath, [tsc, "--noEmit", "-p", project], {
    cwd: siteDir,
  });
  const output = cliText(result).trim();
  if (output) console.log(output);
  return result;
}
