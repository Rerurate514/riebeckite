import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** True when a usable `git` executable is on PATH. */
export const gitAvailable: boolean = isGitAvailable();

/** Files written by one commit. A `null` value deletes the file. */
export type CommitFiles = Record<string, string | null>;

export type TestRepository = {
  /** Work tree root, which is deliberately not the content root. */
  root: string;
  /** Content directory holding the notes. */
  contentRoot: string;
  /** A directory outside the work tree entirely. */
  outsiderRoot: string;
  /** Writes the given files and commits them; returns the commit hash. */
  commit(
    files: CommitFiles,
    message: string,
    date: string,
    cwd?: string,
  ): string;
  dispose(): void;
};

/**
 * Builds a throw-away Git repository whose content directory is nested one
 * level below the work tree root. That offset is the whole point: it reproduces
 * a monorepo where the build working directory, the repository root, and the
 * content directory are three different places.
 */
export function createTestRepository(prefix: string): TestRepository {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const contentRoot = path.join(root, "notes");
  const outsiderRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}out-`));

  fs.mkdirSync(contentRoot, { recursive: true });

  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "test@riebeckite.dev"]);
  git(root, ["config", "user.name", "Riebeckite Test"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);

  return {
    root,
    contentRoot,
    outsiderRoot,
    commit(files, message, date, cwd = root) {
      for (const [relativePath, content] of Object.entries(files)) {
        const target = path.join(cwd, relativePath);
        if (content === null) {
          fs.rmSync(target, { force: true });
          continue;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
      git(cwd, ["add", "-A"]);
      git(cwd, ["commit", "--quiet", "-m", message], {
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      });
      return git(cwd, ["rev-parse", "HEAD"]);
    },
    dispose() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outsiderRoot, { recursive: true, force: true });
    },
  };
}

function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  }).trim();
}

function isGitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
