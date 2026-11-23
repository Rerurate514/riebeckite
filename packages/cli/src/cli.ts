import { runCli } from "./command/runner.js";
import { cliVersion } from "./version.js";

export async function main(arguments_: readonly string[]): Promise<void> {
  const exitCode = await runCli({
    argv: arguments_,
    version: cliVersion,
  });
  if (exitCode !== 0) process.exitCode = exitCode;
}
