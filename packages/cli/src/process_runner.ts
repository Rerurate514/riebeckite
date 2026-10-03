import { spawn } from "node:child_process";

export type CommandResult = {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type CommandRunOptions = {
  readonly cwd?: string;
  readonly input?: string;
};

export type CommandRunner = {
  run(
    command: string,
    arguments_: readonly string[],
    options?: CommandRunOptions,
  ): Promise<CommandResult>;
};

export function createProcessRunner(): CommandRunner {
  return {
    run: (command, arguments_, options) =>
      runProcess(command, arguments_, options ?? {}),
  };
}

function runProcess(
  command: string,
  arguments_: readonly string[],
  options: CommandRunOptions,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [...arguments_], {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("error", (error) => {
      resolve({ code: 127, stdout: "", stderr: String(error) });
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });

    if (child.stdin) {
      child.stdin.on("error", () => {});
      if (options.input === undefined) {
        child.stdin.end();
      } else {
        child.stdin.end(options.input, "utf8");
      }
    }
  });
}
