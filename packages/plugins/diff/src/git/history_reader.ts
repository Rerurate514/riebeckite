import path from "node:path";
import type { DiffRevision, GitHistoryReaderOptions } from "../types.js";
import {
  type GitRepositoryPaths,
  isResolvedRepository,
  normalizeContentPath,
  type RepositoryPathsResolution,
  resolveRepositoryPaths,
  toRepositoryPath,
} from "./repo_paths.js";
import { runGit } from "./run_git.js";

const fieldSeparator = "\u001f";
const recordSeparator = "\u001e";

/**
 * Reads Markdown revisions out of a local Git repository.
 *
 * Callers speak content-relative paths — the same paths the content index
 * reports. The reader resolves the owning work tree once and translates every
 * path itself, so the process working directory never influences a result.
 */
export class GitMarkdownHistoryReader {
  readonly #contentRoot: string;
  readonly #historyCache = new Map<string, Promise<DiffRevision[]>>();
  readonly #markdownCache = new Map<string, Promise<string | null>>();
  /** Maps a content-relative path to `<revision hash>` → work tree path. */
  readonly #revisionPathCache = new Map<string, Map<string, string>>();
  #repository?: Promise<RepositoryPathsResolution>;

  constructor(options: GitHistoryReaderOptions = {}) {
    this.#contentRoot = path.resolve(options.cwd ?? process.cwd());
  }

  /**
   * Revision history for one file, newest first, following renames.
   *
   * @param filePath Content-relative path, e.g. `notes/hello.md`.
   */
  getHistory(filePath: string): Promise<DiffRevision[]> {
    const normalizedPath = normalizeContentPath(filePath);
    const cached = this.#historyCache.get(normalizedPath);
    if (cached) return cached;

    const history = this.#readHistory(normalizedPath);
    this.#historyCache.set(normalizedPath, history);
    return history;
  }

  /** Content of one revision of a file, or `null` when Git cannot read it. */
  getRevisionMarkdown(filePath: string, hash: string): Promise<string | null> {
    const normalizedPath = normalizeContentPath(filePath);
    const cacheKey = `${hash}:${normalizedPath}`;
    const cached = this.#markdownCache.get(cacheKey);
    if (cached) return cached;

    const markdown = this.#readRevisionMarkdown(normalizedPath, hash);
    this.#markdownCache.set(cacheKey, markdown);
    return markdown;
  }

  async #readHistory(filePath: string): Promise<DiffRevision[]> {
    const repository = await this.#resolvePaths();
    if (!repository) return [];

    const format = ["%H", "%h", "%cI", "%s", "%an"].join(fieldSeparator);
    const result = await runGit(
      [
        "log",
        "--follow",
        "--name-status",
        `--format=${recordSeparator}${format}`,
        "--",
        toRepositoryPath(repository, filePath),
      ],
      repository.repositoryRoot,
    );
    if (!result.ok || !result.stdout.trim()) return [];

    // `--name-status` prints work tree paths, which is exactly what
    // `git show <rev>:<path>` needs. Keep them untranslated and fall back to
    // the translated current path for commits Git listed without a name-status
    // line (for example an empty merge commit).
    const revisionPaths = new Map<string, string>();
    const fallbackPath = toRepositoryPath(repository, filePath);
    const revisions = result.stdout
      .split(recordSeparator)
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => parseRevisionRecord(record, revisionPaths, fallbackPath))
      .filter((revision): revision is DiffRevision => revision !== null);

    this.#revisionPathCache.set(filePath, revisionPaths);
    return revisions;
  }

  async #readRevisionMarkdown(
    filePath: string,
    hash: string,
  ): Promise<string | null> {
    const repository = await this.#resolvePaths();
    if (!repository) return null;

    await this.getHistory(filePath);
    const revisionPath =
      this.#revisionPathCache.get(filePath)?.get(hash) ??
      toRepositoryPath(repository, filePath);

    const result = await runGit(
      ["show", `${hash}:${revisionPath}`],
      repository.repositoryRoot,
    );
    return result.ok ? result.stdout : null;
  }

  /** `null` when the content directory has no readable work tree. */
  async #resolvePaths(): Promise<GitRepositoryPaths | null> {
    this.#repository ??= resolveRepositoryPaths(this.#contentRoot);
    const resolution = await this.#repository;
    if (!isResolvedRepository(resolution)) return null;
    return resolution.paths;
  }
}

function parseRevisionRecord(
  record: string,
  revisionPaths: Map<string, string>,
  fallbackPath: string,
): DiffRevision | null {
  const [metadata = "", ...nameStatusLines] = record.split("\n");
  const [hash, shortHash, date, message, author] =
    metadata.split(fieldSeparator);
  if (!hash || !shortHash || !date) return null;

  revisionPaths.set(hash, getRevisionPath(nameStatusLines, fallbackPath));

  return {
    hash,
    shortHash,
    date,
    message: message ?? "",
    author: author ?? "",
  };
}

/**
 * Picks the surviving path of a `--name-status` line: the destination for a
 * rename or copy, otherwise the single changed path. All of them are work tree
 * relative, which is what `git show <rev>:<path>` expects.
 */
function getRevisionPath(
  nameStatusLines: string[],
  fallbackPath: string,
): string {
  const line = nameStatusLines.find((entry) => entry.trim().length > 0);
  if (!line) return fallbackPath;

  const [, ...paths] = line.split("\t");
  return normalizeContentPath(paths.at(-1) ?? fallbackPath);
}
