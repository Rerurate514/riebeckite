import fs from "node:fs/promises";
import path from "node:path";

export function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function validateLogicalPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").normalize("NFC");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    normalized
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          hasForbiddenPathCharacter(part) ||
          /[. ]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part),
      )
  )
    throw new Error("Invalid content path.");
  return normalized;
}

export function hasForbiddenPathCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || '<>:"|?*'.includes(character);
  });
}

export async function safeFilePath(
  root: string,
  logicalPath: string,
  createParents: boolean,
): Promise<string> {
  const normalized = validateLogicalPath(logicalPath);
  const filePath = path.resolve(root, ...normalized.split("/"));
  if (!isWithin(root, filePath))
    throw new Error("Content path escapes the workspace.");
  const parent = path.dirname(filePath);
  if (createParents) await fs.mkdir(parent, { recursive: true });
  let current = root;
  for (const part of path
    .relative(root, parent)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, part);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory())
      throw new Error(
        "Content path traverses a symbolic link or non-directory.",
      );
  }
  try {
    if ((await fs.lstat(filePath)).isSymbolicLink())
      throw new Error("Content path is a symbolic link.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return filePath;
}

export async function assertSafeExistingParents(
  root: string,
  logicalPath: string,
): Promise<void> {
  const normalized = validateLogicalPath(logicalPath);
  let current = root;
  for (const part of normalized.split("/").slice(0, -1)) {
    current = path.join(current, part);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory())
        throw new Error(
          "Content path traverses a symbolic link or non-directory.",
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}
