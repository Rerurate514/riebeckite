import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config.js";
import { normalizeContentPath } from "./attachment.js";
import type {
  ContentSource,
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source.js";

export const INTERNAL_CONTENT_IGNORE_PATTERNS = [
  ".git",
  ".git/**",
  ".github",
  ".github/**",
  ".obsidian",
  ".obsidian/**",
  "node_modules",
  "node_modules/**",
  "**/.DS_Store",
  "**/Thumbs.db",
  "**/desktop.ini",
] as const;

export type ContentSourceExclusion = {
  readonly path: string;
  readonly pattern: string;
};

export type ContentSourceScan = {
  readonly entries: readonly ContentSourceEntry[];
  readonly exclusions: readonly ContentSourceExclusion[];
};

export class FileSystemContentSource implements ContentSource {
  constructor(
    private contentDirectory: string,
    private exclude: readonly string[] = [],
  ) {}

  async scan(): Promise<readonly ContentSourceEntry[]> {
    return (await this.scanWithExclusions()).entries;
  }

  async scanWithExclusions(): Promise<ContentSourceScan> {
    const exclusions: ContentSourceExclusion[] = [];
    try {
      const entries = await this.scanDirectory(
        this.contentDirectory,
        "",
        exclusions,
      );
      return { entries, exclusions };
    } catch (error) {
      if (isMissingDirectoryError(error, this.contentDirectory)) {
        throw missingContentDirectoryError(this.contentDirectory);
      }
      throw error;
    }
  }

  async read(entry: ContentSourceEntry): Promise<ContentSourceContent> {
    const filePath = this.resolveFilePath(entry.path);
    const stats = await fs.lstat(filePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`Content entry is not a regular file: ${entry.path}`);
    }
    return await fs.readFile(filePath);
  }

  private async scanDirectory(
    directory: string,
    parentPath: string,
    exclusions: ContentSourceExclusion[],
  ): Promise<ContentSourceEntry[]> {
    const directoryEntries = await fs.readdir(directory, {
      withFileTypes: true,
    });
    const entries: ContentSourceEntry[] = [];

    for (const directoryEntry of directoryEntries) {
      if (directoryEntry.isSymbolicLink()) continue;

      const logicalPath = normalizeContentPath(
        parentPath
          ? `${parentPath}/${directoryEntry.name}`
          : directoryEntry.name,
      );
      const filePath = path.join(directory, directoryEntry.name);

      if (isExcluded(INTERNAL_CONTENT_IGNORE_PATTERNS, logicalPath)) continue;

      const pattern = matchContentExcludePattern(logicalPath, this.exclude);
      if (pattern !== undefined) {
        exclusions.push({ path: logicalPath, pattern });
        continue;
      }

      if (directoryEntry.isDirectory()) {
        entries.push(
          ...(await this.scanDirectory(filePath, logicalPath, exclusions)),
        );
        continue;
      }
      if (!directoryEntry.isFile()) continue;

      const stats = await fs.stat(filePath);
      entries.push({
        path: logicalPath,
        metadata: {
          modifiedAt: stats.mtimeMs,
          size: stats.size,
        },
      });
    }

    return entries;
  }

  private resolveFilePath(logicalPath: string): string {
    const normalizedPath = normalizeLogicalPath(logicalPath);
    const filePath = path.resolve(this.contentDirectory, normalizedPath);
    const relativePath = path.relative(this.contentDirectory, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`Invalid content path: ${logicalPath}`);
    }
    return filePath;
  }
}

export function isIgnoredContentPath(
  logicalPath: string,
  exclude: readonly string[] = [],
): boolean {
  if (isExcluded(INTERNAL_CONTENT_IGNORE_PATTERNS, logicalPath)) return true;
  return matchContentExcludePattern(logicalPath, exclude) !== undefined;
}

export function matchContentExcludePattern(
  logicalPath: string,
  exclude: readonly string[] = [],
): string | undefined {
  const direct = exclude.find((pattern) => isExcluded([pattern], logicalPath));
  if (direct !== undefined) return direct;
  if (!logicalPath.endsWith(".md")) return undefined;
  const withoutExtension = logicalPath.slice(0, -3);
  return exclude.find((pattern) => isExcluded([pattern], withoutExtension));
}

function normalizeLogicalPath(logicalPath: string): string {
  const normalizedPath = normalizeContentPath(logicalPath);
  if (
    normalizedPath.length === 0 ||
    normalizedPath.startsWith("/") ||
    path.isAbsolute(normalizedPath) ||
    path.win32.isAbsolute(normalizedPath) ||
    normalizedPath.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Invalid content path: ${logicalPath}`);
  }
  return normalizedPath;
}

function isMissingDirectoryError(
  error: unknown,
  directory: string,
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT" &&
    "path" in error &&
    error.path === directory
  );
}

function missingContentDirectoryError(directory: string): Error {
  const relative = path.relative(process.cwd(), directory);
  const display = relative && !relative.startsWith("..") ? relative : directory;
  const error = new Error(
    `Could not find the content directory:\n\n  ${display}`,
  ) as Error & { hint?: string };
  error.hint = "Check `content.directory` in your Riebeckite configuration.";
  return error;
}
