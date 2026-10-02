import path from "node:path";
import type { ChangelogCommit, GitChangelogReaderOptions } from "../types.js";
import {
  type GitRepositoryPaths,
  isResolvedRepository,
  normalizeContentPath,
  type RepositoryPathsResolution,
  resolveRepositoryPaths,
  toContentPath,
  toRepositoryPath,
} from "./repo_paths.js";
import { runGit } from "./run_git.js";

const fieldSeparator = "\u001f";
const recordSeparator = "\u001e";
const logFormat = ["%H", "%h", "%cI", "%s", "%an"].join(fieldSeparator);

/** Optional window applied to a Git query. */
export type GitLogWindow = {
  /** ISO timestamp passed to `git log --since`. */
  since?: string;
};

/**
 * Reads local Git history for individual files and for the whole content
 * directory. Mirrors the Git access used by `@riebeckite/plugin-diff`: it runs
 * `git` through `execFile` and degrades to empty results when Git is missing or
 * the content directory is not a repository.
 *
 * Callers speak content-relative paths — the same paths the content index
 * reports. The reader resolves the owning work tree once and translates every
 * path itself, so the process working directory never influences a result.
 */
export class GitChangelogReader {
  readonly #contentRoot: string;
  readonly #fileCache = new Map<string, Promise<ChangelogCommit[]>>();
  #recentCache?: Promise<ChangelogCommit[]>;
  #repository?: Promise<RepositoryPathsResolution>;

  constructor(options: GitChangelogReaderOptions = {}) {
    this.#contentRoot = path.resolve(options.cwd ?? process.cwd());
  }

  /**
   * Resolves the Git work tree that owns the content directory, or the reason
   * it cannot be resolved. Memoized: every Git query reuses the same answer.
   */
  resolveRepository(): Promise<RepositoryPathsResolution> {
    this.#repository ??= resolveRepositoryPaths(this.#contentRoot);
    return this.#repository;
  }

  /** True when the content directory lives inside a Git work tree. */
  async isAvailable(): Promise<boolean> {
    return isResolvedRepository(await this.resolveRepository());
  }

  /**
   * Commit history for one file, newest first, following renames.
   *
   * @param filePath Content-relative path, e.g. `notes/hello.md`.
   */
  getFileHistory(
    filePath: string,
    window: GitLogWindow = {},
  ): Promise<ChangelogCommit[]> {
    const normalizedPath = normalizeContentPath(filePath);
    if (window.since)
      return this.#readFileHistory(normalizedPath, window.since);

    const cached = this.#fileCache.get(normalizedPath);
    if (cached) return cached;

    const history = this.#readFileHistory(normalizedPath);
    this.#fileCache.set(normalizedPath, history);
    return history;
  }

  /**
   * Recent commits that touch the content directory, newest first, each with
   * the content-relative paths it changed.
   */
  getRecentCommits(window: GitLogWindow = {}): Promise<ChangelogCommit[]> {
    if (window.since) return this.#readRecentCommits(window.since);
    this.#recentCache ??= this.#readRecentCommits();
    return this.#recentCache;
  }

  async #readFileHistory(
    filePath: string,
    since?: string,
  ): Promise<ChangelogCommit[]> {
    const repository = await this.#resolvePaths();
    if (!repository) return [];

    const args = ["log", "--follow", `--format=${recordSeparator}${logFormat}`];
    if (since) args.push(`--since=${since}`);
    args.push("--", toRepositoryPath(repository, filePath));

    const result = await runGit(args, repository.repositoryRoot);
    if (!result.ok) return [];
    return parseCommitRecords(result.stdout);
  }

  async #readRecentCommits(since?: string): Promise<ChangelogCommit[]> {
    const repository = await this.#resolvePaths();
    if (!repository) return [];

    const args = [
      "log",
      `--format=${recordSeparator}${logFormat}`,
      "--name-only",
    ];
    if (since) args.push(`--since=${since}`);
    // `--name-only` prints paths relative to the work tree root, so scope the
    // walk to the content directory and translate each printed path back.
    args.push("--", repository.contentPrefix || ".");

    const result = await runGit(args, repository.repositoryRoot);
    if (!result.ok) return [];
    return parseCommitRecords(result.stdout).map((commit) => ({
      ...commit,
      files: commit.files
        .map((file) => toContentPath(repository, file))
        .filter((file): file is string => file !== null),
    }));
  }

  /** `null` when the content directory has no readable work tree. */
  async #resolvePaths(): Promise<GitRepositoryPaths | null> {
    const resolution = await this.resolveRepository();
    if (!isResolvedRepository(resolution)) return null;
    return resolution.paths;
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
      .map(normalizeContentPath),
  };
}
