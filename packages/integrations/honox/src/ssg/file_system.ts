import { relative, resolve } from "node:path";

export function isMissingDirectoryError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export function isAbsolutePath(path: string): boolean {
  return /^([a-z]:)?[\\/]/iu.test(path);
}

export function resolveWithinDirectory(
  directory: string,
  relativePath: string,
  label: string,
): string {
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    isAbsolutePath(relativePath)
  ) {
    throw new Error(`Invalid ${label}: ${relativePath}`);
  }
  const file = resolve(directory, relativePath);
  const relativePathFromDirectory = relative(directory, file);
  if (
    relativePathFromDirectory.startsWith("..") ||
    relativePathFromDirectory === "" ||
    isAbsolutePath(relativePathFromDirectory)
  ) {
    throw new Error(`Unsafe ${label}: ${relativePath}`);
  }
  return file;
}
