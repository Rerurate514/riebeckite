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

export class FileSystemContentSource implements ContentSource {
  constructor(
    private contentDirectory: string,
    private exclude: readonly string[] = [],
  ) {}

  async scan(): Promise<readonly ContentSourceEntry[]> {
    try {
      return await this.scanDirectory(this.contentDirectory, "");
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

      if (this.isExcluded(logicalPath)) continue;

      if (directoryEntry.isDirectory()) {
        entries.push(...(await this.scanDirectory(filePath, logicalPath)));
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

  private isExcluded(logicalPath: string): boolean {
    return isIgnoredContentPath(logicalPath, this.exclude);
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
  if (isExcluded(exclude, logicalPath)) return true;
  return (
    logicalPath.endsWith(".md") && isExcluded(exclude, logicalPath.slice(0, -3))
  );
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
