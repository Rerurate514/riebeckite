import { createRequire } from "node:module";
import { runCli } from "./command/runner.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export async function main(arguments_: readonly string[]): Promise<void> {
  const exitCode = await runCli({ argv: arguments_, version });
  if (exitCode !== 0) process.exitCode = exitCode;
}
