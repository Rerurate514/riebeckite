import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Result of a `git` invocation.
 *
 * Failures are returned instead of thrown: a site whose Git history cannot be
 * read must still build, so every caller decides what an unavailable repository
 * means for its own output.
 */
export type GitCommandResult =
  | { ok: true; stdout: string }
  /**
   * `spawnError` separates "Git could not be started" (missing or unexecutable
   * binary) from "Git ran and rejected the command" (not a work tree, unknown
   * revision, unreadable path). The distinction drives which diagnostic a
   * plugin reports.
   */
  | { ok: false; spawnError: boolean; detail: string };

/**
 * Narrows a failed command so its failure fields can be read.
 *
 * Type predicates are used instead of `result.ok` checks throughout this
 * package because the build type-checks without `strictNullChecks`, where
 * discriminant narrowing of an inline condition does not apply.
 */
export function isGitCommandFailure(
  result: GitCommandResult,
): result is Extract<GitCommandResult, { ok: false }> {
  return result.ok === false;
}

/**
 * Runs `git` with `args`.
 *
 * `core.quotePath=false` keeps non-ASCII paths verbatim so the printed paths
 * match the ones the content index reports; Git otherwise escapes them into
 * octal sequences that no path lookup can resolve.
 *
 * @param cwd Directory Git runs in. Omit when the command carries its own
 *   `-C <dir>` argument.
 */
export async function runGit(
  args: readonly string[],
  cwd?: string,
): Promise<GitCommandResult> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-c", "core.quotePath=false", ...args],
      {
        ...(cwd === undefined ? {} : { cwd }),
        maxBuffer: 1024 * 1024 * 10,
      },
    );
    return { ok: true, stdout };
  } catch (error) {
    return {
      ok: false,
      spawnError: isSpawnFailure(readErrorCode(error)),
      detail: describeGitFailure(error),
    };
  }
}

function readErrorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

/**
 * Spawn failures carry an errno such as `ENOENT`. Rejections raised after the
 * process started carry Node's own `ERR_*` codes or a numeric exit status, and
 * those describe the command, not the Git executable.
 */
function isSpawnFailure(code: unknown): boolean {
  return typeof code === "string" && !code.startsWith("ERR_");
}

function describeGitFailure(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return error instanceof Error ? error.message : String(error);
  }

  const stderr = "stderr" in error ? error.stderr : undefined;
  if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
  if (error instanceof Error) return error.message;
  return String(error);
}
