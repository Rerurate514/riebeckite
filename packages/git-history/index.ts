import path from "node:path";
import {
  type GitRepositoryPaths,
  isResolvedRepository,
  type RepositoryPathsResolution,
  resolveRepositoryPaths,
} from "./src/repo_paths.js";
import { runGit } from "./src/run_git.js";

export {
  type GitRepositoryPaths,
  isResolvedRepository,
  normalizeContentPath,
  type RepositoryPathsResolution,
  resolveRepositoryPaths,
  toContentPath,
  toRepositoryPath,
} from "./src/repo_paths.js";
export { isGitCommandFailure, runGit } from "./src/run_git.js";

export type GitRepositoryOptions = {
  cwd?: string;
};

export class GitRepository {
  readonly #contentRoot: string;
  #resolution?: Promise<RepositoryPathsResolution>;

  constructor(options: GitRepositoryOptions = {}) {
    this.#contentRoot = path.resolve(options.cwd ?? process.cwd());
  }

  resolve(): Promise<RepositoryPathsResolution> {
    this.#resolution ??= resolveRepositoryPaths(this.#contentRoot);
    return this.#resolution;
  }

  async isAvailable(): Promise<boolean> {
    return isResolvedRepository(await this.resolve());
  }

  async paths(): Promise<GitRepositoryPaths | null> {
    const resolution = await this.resolve();
    if (!isResolvedRepository(resolution)) return null;
    return resolution.paths;
  }

  async getStateFingerprint(): Promise<string | null> {
    const paths = await this.paths();
    if (!paths) return null;
    const results = await Promise.all([
      runGit(["rev-parse", "HEAD"], paths.repositoryRoot),
      runGit(
        ["status", "--porcelain=v1", "--untracked-files=all"],
        paths.repositoryRoot,
      ),
      runGit(
        ["for-each-ref", "--format=%(refname):%(objectname)"],
        paths.repositoryRoot,
      ),
    ]);
    if (results.some((result) => !result.ok)) return null;
    return results
      .filter((result): result is { ok: true; stdout: string } => result.ok)
      .map((result) => result.stdout)
      .join("\u001e");
  }
}
