import path from "node:path";
import { isGitCommandFailure, runGit } from "./run_git.js";

/**
 * The paths that locate a content directory inside a Git work tree.
 *
 * Every field is a POSIX-separated path (`git` prints and accepts those on every
 * platform, including Windows).
 */
export type GitRepositoryPaths = {
  /** Work tree root reported by `git rev-parse --show-toplevel`. */
  repositoryRoot: string;
  /** Absolute path of the content directory. */
  contentRoot: string;
  /**
   * Content directory relative to `repositoryRoot`, without a trailing slash.
   * Empty when the content directory is the work tree root itself.
   */
  contentPrefix: string;
};

/**
 * Why Git history cannot be read for a content directory.
 *
 * The reason is modelled explicitly so a plugin can report an actionable
 * diagnostic instead of quietly rendering nothing.
 */
export type RepositoryPathsResolution =
  | { kind: "resolved"; paths: GitRepositoryPaths }
  /** Git is not installed, or could not be started. */
  | { kind: "git-unavailable"; detail: string }
  /** Git ran, but the content directory does not live in a work tree. */
  | { kind: "content-outside-repository"; detail: string };

/**
 * Locates the Git work tree that owns `contentRoot`.
 *
 * Both the work tree root and the content prefix come from Git itself, so their
 * casing and symlink resolution always agree with the paths `git log` prints —
 * the reason content-relative paths can be translated without guessing.
 *
 * The work tree is resolved through `git -C <contentRoot>` rather than by
 * running Git in `contentRoot`, so a missing directory surfaces as a Git
 * failure instead of an indistinguishable spawn failure.
 */
export async function resolveRepositoryPaths(
  contentRoot: string,
): Promise<RepositoryPathsResolution> {
  const resolvedContentRoot = path.resolve(contentRoot);
  const result = await runGit([
    "-C",
    resolvedContentRoot,
    "rev-parse",
    "--show-toplevel",
    "--show-prefix",
  ]);
  if (isGitCommandFailure(result)) {
    return result.spawnError
      ? { kind: "git-unavailable", detail: result.detail }
      : { kind: "content-outside-repository", detail: result.detail };
  }

  const [toplevel, prefix] = parseRevParseOutput(result.stdout);
  if (!toplevel) {
    return {
      kind: "content-outside-repository",
      detail: "git rev-parse reported no work tree root",
    };
  }

  return {
    kind: "resolved",
    paths: {
      repositoryRoot: toPosixPath(path.normalize(toplevel)),
      contentRoot: toPosixPath(resolvedContentRoot),
      contentPrefix: toPosixPath(prefix).replace(/\/+$/, ""),
    },
  };
}

/**
 * Translates a content-relative path into the work tree-relative path that
 * `git log` pathspecs and `git show <rev>:<path>` expect.
 */
export function toRepositoryPath(
  paths: GitRepositoryPaths,
  contentRelativePath: string,
): string {
  const normalized = normalizeContentPath(contentRelativePath);
  if (!paths.contentPrefix) return normalized;
  if (!normalized) return paths.contentPrefix;
  return `${paths.contentPrefix}/${normalized}`;
}

/**
 * Translates a work tree-relative path printed by `git` back into a
 * content-relative path, or returns `null` when the path lies outside the
 * content directory.
 */
export function toContentPath(
  paths: GitRepositoryPaths,
  repositoryRelativePath: string,
): string | null {
  const normalized = normalizeContentPath(repositoryRelativePath);
  if (!normalized) return null;
  if (!paths.contentPrefix) return normalized;
  if (!normalized.startsWith(`${paths.contentPrefix}/`)) return null;
  return normalized.slice(paths.contentPrefix.length + 1);
}

/** Normalizes a path to the POSIX form used for content and work tree paths. */
export function normalizeContentPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * True when the content directory has a usable work tree. Narrows the
 * resolution so callers can read `paths`.
 */
export function isResolvedRepository(
  resolution: RepositoryPathsResolution,
): resolution is Extract<RepositoryPathsResolution, { kind: "resolved" }> {
  return resolution.kind === "resolved";
}

/**
 * True when history cannot be read and a reason is available. Narrows the
 * resolution so callers can read `detail`.
 */
export function isRepositoryUnavailable(
  resolution: RepositoryPathsResolution,
): resolution is Exclude<RepositoryPathsResolution, { kind: "resolved" }> {
  return resolution.kind !== "resolved";
}

/**
 * Splits `git rev-parse --show-toplevel --show-prefix` output. The prefix line
 * is omitted entirely when the content directory is the work tree root.
 */
function parseRevParseOutput(stdout: string): [string, string] {
  const [toplevel = "", prefix = ""] = stdout.split(/\r?\n/);
  return [toplevel.trim(), prefix.trim()];
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}
