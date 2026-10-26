import { spawn } from "node:child_process";

export type CommandResult = {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
};

type CommandRunOptions = {
  readonly cwd?: string;
  readonly input?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly shell?: boolean;
  readonly signal?: AbortSignal;
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
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      resolve(result);
    };
    const child = spawn(command, [...arguments_], {
      cwd: options.cwd,
      env: options.environment,
      shell: options.shell,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: options.signal !== undefined && process.platform !== "win32",
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("error", (error) => {
      finish({ code: 127, stdout: "", stderr: String(error) });
    });
    child.on("close", (code) => {
      finish({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });

    const abort = () => {
      if (child.pid === undefined) return;
      if (process.platform === "win32") {
        const taskkill = spawn(
          "taskkill",
          ["/pid", String(child.pid), "/T", "/F"],
          {
            stdio: "ignore",
            windowsHide: true,
          },
        );
        taskkill.on("error", () => child.kill());
      } else process.kill(-child.pid, "SIGTERM");
    };
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });

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
