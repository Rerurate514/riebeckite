import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangelogCommit, GitChangelogReaderOptions } from "../types.js";

const execFileAsync = promisify(execFile);
const fieldSeparator = "\u001f";
const recordSeparator = "\u001e";
const logFormat = ["%H", "%h", "%cI", "%s", "%an"].join(fieldSeparator);

/** Optional window applied to a Git query. */
export type GitLogWindow = {
  /** ISO timestamp passed to `git log --since`. */
  since?: string;
};

/**
 * Reads local Git history for individual files and for the whole working
 * directory. Mirrors the Git access used by `@riebeckite/plugin-diff`: it runs
 * `git` through `execFile` and degrades to empty results when Git is missing or
 * the directory is not a repository.
 */
export class GitChangelogReader {
  readonly #cwd: string;
  readonly #fileCache = new Map<string, Promise<ChangelogCommit[]>>();
  #recentCache?: Promise<ChangelogCommit[]>;
  #repositoryAvailable?: Promise<boolean>;

  constructor(options: GitChangelogReaderOptions = {}) {
    this.#cwd = options.cwd ?? process.cwd();
  }

  /** Commit history for one file, newest first, following renames. */
  getFileHistory(
    filePath: string,
    window: GitLogWindow = {},
  ): Promise<ChangelogCommit[]> {
    const normalizedPath = normalizeGitPath(filePath);
    if (window.since)
      return this.#readFileHistory(normalizedPath, window.since);

    const cached = this.#fileCache.get(normalizedPath);
    if (cached) return cached;

    const history = this.#readFileHistory(normalizedPath);
    this.#fileCache.set(normalizedPath, history);
    return history;
  }

  /**
   * Recent commits that touch the working directory, newest first, each with
   * the paths it changed.
   */
  getRecentCommits(window: GitLogWindow = {}): Promise<ChangelogCommit[]> {
    if (window.since) return this.#readRecentCommits(window.since);
    this.#recentCache ??= this.#readRecentCommits();
    return this.#recentCache;
  }

  /** True when `cwd` is inside a Git working tree. */
  async isAvailable(): Promise<boolean> {
    this.#repositoryAvailable ??= runGit(this.#cwd, [
      "rev-parse",
      "--is-inside-work-tree",
    ]).then((result) => result.ok && result.stdout.trim() === "true");

    return this.#repositoryAvailable;
  }

  async #readFileHistory(
    filePath: string,
    since?: string,
  ): Promise<ChangelogCommit[]> {
    if (!(await this.isAvailable())) return [];

    const args = ["log", "--follow", `--format=${recordSeparator}${logFormat}`];
    if (since) args.push(`--since=${since}`);
    args.push("--", filePath);

    const result = await runGit(this.#cwd, args);
    if (!result.ok) return [];
    return parseCommitRecords(result.stdout);
  }

  async #readRecentCommits(since?: string): Promise<ChangelogCommit[]> {
    if (!(await this.isAvailable())) return [];

    const args = [
      "log",
      `--format=${recordSeparator}${logFormat}`,
      "--name-only",
    ];
    if (since) args.push(`--since=${since}`);
    args.push("--", ".");

    const result = await runGit(this.#cwd, args);
    if (!result.ok) return [];
    return parseCommitRecords(result.stdout);
  }
}

function parseCommitRecords(stdout: string): ChangelogCommit[] {
  if (!stdout.trim()) return [];

  return stdout
    .split(recordSeparator)
    .map((chunk) => chunk.replace(/^\n+/, "").replace(/\n+$/, ""))
    .filter(Boolean)
    .map(parseCommitRecord)
    .filter((commit): commit is ChangelogCommit => commit !== null);
}

function parseCommitRecord(chunk: string): ChangelogCommit | null {
  const [header = "", ...rest] = chunk.split("\n");
  const [hash, shortHash, date, subject, author] = header.split(fieldSeparator);
  if (!hash || !shortHash || !date) return null;

  return {
    hash,
    shortHash,
    date,
    subject: subject ?? "",
    author: author ?? "",
    files: rest
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizeGitPath),
  };
}

function normalizeGitPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

async function runGit(
  cwd: string,
  args: string[],
): Promise<{ ok: true; stdout: string } | { ok: false; stdout: string }> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 1024 * 1024 * 10,
    });
    return { ok: true, stdout };
  } catch (error) {
    const stdout =
      typeof error === "object" &&
      error !== null &&
      "stdout" in error &&
      typeof error.stdout === "string"
        ? error.stdout
        : "";
    return { ok: false, stdout };
  }
}
