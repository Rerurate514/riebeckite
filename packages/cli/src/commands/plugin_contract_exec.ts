import { spawnSync } from "node:child_process";
import { pass } from "./plugin_contract_results.js";
import type {
  PluginContractFixtureCommand,
  PluginContractResult,
} from "./plugin_contract_types.js";

export const MAX_BUFFER = 128 * 1024 * 1024;

export function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; allowFailure?: boolean } = {},
): { status: number | null; stdout: string; stderr: string } {
  const useShell = process.platform === "win32" && !command.endsWith(".exe");
  const result = spawnSync(command, [...args], {
    shell: useShell,
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
  });
  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `Command failed (exit ${result.status}): ${command}\n${stdout}\n${stderr}`,
    );
  }
  return { status: result.status, stdout, stderr };
}

export function executeFixtureCommand(
  contract: string,
  command: PluginContractFixtureCommand,
): PluginContractResult {
  try {
    const result = run(command.command, command.args, {
      cwd: command.cwd,
      allowFailure: true,
    });
    const output = [result.stdout, result.stderr]
      .map((text) => text.trim())
      .filter(Boolean)
      .join("\n");
    const commandLine = [command.command, ...command.args].join(" ");
    if (result.status === 0) {
      return pass(
        contract,
        `${commandLine} exits 0`,
        "trusted fixture command completed",
      );
    }
    return {
      contract,
      status: "FAIL",
      expected: `${commandLine} exits 0`,
      actual: `exit ${result.status}${output ? `\n${tail(output, 40)}` : ""}`,
      guidance: "Inspect the fixture output and rerun the same command.",
      executed: true,
    };
  } catch (error) {
    return {
      contract,
      status: "FAIL",
      expected: `${[command.command, ...command.args].join(" ")} exits 0`,
      actual: error instanceof Error ? error.message : String(error),
      guidance:
        "The trusted fixture could not start. Check the command and its working directory.",
      executed: false,
    };
  }
}

export function tail(text: string, lines: number): string {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}
