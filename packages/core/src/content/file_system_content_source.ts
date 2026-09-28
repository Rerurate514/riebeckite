import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";
import { normalizeContentPath } from "./attachment";
import type {
  ContentSource,
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source";

export class FileSystemContentSource implements ContentSource {
  constructor(
    private contentDirectory: string,
    private exclude: readonly string[] = [],
  ) {}

  async scan(): Promise<readonly ContentSourceEntry[]> {
    return await this.scanDirectory(this.contentDirectory, "");
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
        parentPath ? `${parentPath}/${directoryEntry.name}` : directoryEntry.name,
      );
      const filePath = path.join(directory, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        entries.push(...(await this.scanDirectory(filePath, logicalPath)));
        continue;
      }
      if (!directoryEntry.isFile() || this.isExcluded(logicalPath)) continue;

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
    if (isExcluded(this.exclude, logicalPath)) return true;
    return logicalPath.endsWith(".md") &&
      isExcluded(this.exclude, logicalPath.slice(0, -3));
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
