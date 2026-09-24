import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { DiffRevision, GitHistoryReaderOptions } from "../types.js";

const execFileAsync = promisify(execFile);
const fieldSeparator = "\u001f";
const recordSeparator = "\u001e";

export class GitMarkdownHistoryReader {
  readonly #cwd: string;
  readonly #historyCache = new Map<string, Promise<DiffRevision[]>>();
  readonly #markdownCache = new Map<string, Promise<string | null>>();
  readonly #revisionPathCache = new Map<string, Map<string, string>>();
  #repositoryAvailable?: Promise<boolean>;

  constructor(options: GitHistoryReaderOptions = {}) {
    this.#cwd = options.cwd ?? process.cwd();
  }

  getHistory(filePath: string): Promise<DiffRevision[]> {
    const normalizedPath = normalizeGitPath(this.#cwd, filePath);
    const cached = this.#historyCache.get(normalizedPath);
    if (cached) return cached;

    const history = this.#readHistory(normalizedPath);
    this.#historyCache.set(normalizedPath, history);
    return history;
  }

  getRevisionMarkdown(filePath: string, hash: string): Promise<string | null> {
    const normalizedPath = normalizeGitPath(this.#cwd, filePath);
    const cacheKey = `${hash}:${normalizedPath}`;
    const cached = this.#markdownCache.get(cacheKey);
    if (cached) return cached;

    const markdown = this.#readRevisionMarkdown(normalizedPath, hash);
    this.#markdownCache.set(cacheKey, markdown);
    return markdown;
  }

  async #readHistory(filePath: string): Promise<DiffRevision[]> {
    if (!(await this.#isRepositoryAvailable())) return [];

    const format = ["%H", "%h", "%cI", "%s", "%an"].join(fieldSeparator);
    const result = await runGit(this.#cwd, [
      "log",
      "--follow",
      "--name-status",
      `--format=${recordSeparator}${format}`,
      "--",
      filePath,
    ]);
    if (!result.ok || !result.stdout.trim()) return [];

    const revisionPaths = new Map<string, string>();
    const revisions = result.stdout
      .split(recordSeparator)
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => parseRevisionRecord(record, revisionPaths, filePath))
      .filter((revision): revision is DiffRevision => revision !== null);

    this.#revisionPathCache.set(filePath, revisionPaths);
    return revisions;
  }

  async #readRevisionMarkdown(
    filePath: string,
    hash: string,
  ): Promise<string | null> {
    if (!(await this.#isRepositoryAvailable())) return null;

    await this.getHistory(filePath);
    const revisionPath =
      this.#revisionPathCache.get(filePath)?.get(hash) ?? filePath;

    const result = await runGit(this.#cwd, ["show", `${hash}:${revisionPath}`]);
    return result.ok ? result.stdout : null;
  }

  #isRepositoryAvailable(): Promise<boolean> {
    this.#repositoryAvailable ??= runGit(this.#cwd, [
      "rev-parse",
      "--is-inside-work-tree",
    ]).then((result) => result.ok && result.stdout.trim() === "true");

    return this.#repositoryAvailable;
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

function getRevisionPath(
  nameStatusLines: string[],
  fallbackPath: string,
): string {
  const line = nameStatusLines.find((entry) => entry.trim().length > 0);
  if (!line) return fallbackPath;

  const [, ...paths] = line.split("\t");
  return paths.at(-1) ?? fallbackPath;
}

function normalizeGitPath(cwd: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);
  return path.relative(cwd, absolutePath).split(path.sep).join("/");
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
