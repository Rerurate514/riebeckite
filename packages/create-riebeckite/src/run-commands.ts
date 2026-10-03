import { spawn } from "node:child_process";

export type CommandRunner = (
  command: string,
  args: readonly string[],
  cwd: string,
) => Promise<number>;

export function spawnCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
