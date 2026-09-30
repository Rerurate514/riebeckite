import { spawn, spawnSync } from "node:child_process";

/** Upper bound on captured stdout/stderr per command. */
export const MAX_BUFFER = 128 * 1024 * 1024;

/**
 * Quote a value for the shell command line. Values containing whitespace or a
 * double quote are wrapped and their quotes escaped; everything else is passed
 * through unchanged.
 */
export function quote(value: unknown): string {
  const text = String(value);
  return /[\s"]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

export interface RunOptions {
  /** Working directory. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Extra environment variables merged over `process.env`. */
  env?: Record<string, string | undefined>;
  /** Return the result instead of throwing on a non-zero exit. */
  allowFailure?: boolean;
}

export interface RunResult {
  /** Process exit status, or `null` when the process was signalled. */
  status: number | null;
  stdout: string;
  stderr: string;
}

function failureDetail(stdout: string, stderr: string): string {
  return `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
}

/**
 * Run a command through the shell, synchronously. Throws on spawn errors and,
 * unless `allowFailure` is set, on a non-zero exit status. The command and its
 * arguments are quoted and joined into a single shell line.
 */
export function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): RunResult {
  const line = [command, ...args].map(quote).join(" ");
  const result = spawnSync(line, {
    shell: true,
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
  });

  if (result.error) {
    throw new Error(`Failed to run: ${line}\n${result.error.message}`);
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `Command failed (exit ${result.status}): ${line}\n` +
        failureDetail(stdout, stderr),
    );
  }

  return { status: result.status, stdout, stderr };
}

/**
 * Asynchronous counterpart of {@link run}, suitable for parallel jobs. Mirrors
 * the synchronous semantics: shell execution, the same buffer cap, and a
 * rejection on spawn error or (unless `allowFailure` is set) non-zero exit.
 */
export function runAsync(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> {
  const line = [command, ...args].map(quote).join(" ");
  return new Promise((resolve, reject) => {
    const child = spawn(line, {
      shell: true,
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    let exceeded = false;
    let stdout = "";
    let stderr = "";

    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (!stdoutStream || !stderrStream) {
      child.kill("SIGKILL");
      reject(new Error(`Failed to run: ${line}\nno stdio streams available`));
      return;
    }

    const onData = (kind: "stdout" | "stderr", chunk: string): void => {
      // Each stream is capped independently, matching `run`'s maxBuffer.
      const length = kind === "stdout" ? stdout.length : stderr.length;
      if (length + chunk.length > MAX_BUFFER) {
        exceeded = true;
        child.kill("SIGKILL");
        return;
      }
      if (kind === "stdout") stdout += chunk;
      else stderr += chunk;
    };
    stdoutStream.setEncoding("utf8");
    stderrStream.setEncoding("utf8");
    stdoutStream.on("data", (chunk: string) => onData("stdout", chunk));
    stderrStream.on("data", (chunk: string) => onData("stderr", chunk));

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed to run: ${line}\n${error.message}`));
    });

    child.on("close", (status) => {
      if (settled) return;
      settled = true;
      if (exceeded) {
        reject(
          new Error(`Command output exceeded ${MAX_BUFFER} bytes: ${line}`),
        );
        return;
      }
      if (status !== 0 && !options.allowFailure) {
        reject(
          new Error(
            `Command failed (exit ${status}): ${line}\n` +
              failureDetail(stdout, stderr),
          ),
        );
        return;
      }
      resolve({ status, stdout, stderr });
    });
  });
}
