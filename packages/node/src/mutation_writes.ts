import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { retryOnSharingViolation } from "./file_system_content_migration_helpers.js";
import type { FileState } from "./mutation_context.js";
import { fingerprint, stateOf } from "./mutation_files.js";

export async function writeFileExclusive(
  filePath: string,
  content: Uint8Array,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const handle = await fs.open(filePath, "wx");
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function restoreCapturedFile(
  target: string,
  captured: string,
): Promise<void> {
  try {
    await writeFileExclusive(target, await fs.readFile(captured));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export function isHardLinkUnsupported(code: string | undefined): boolean {
  return code === "ENOSYS" || code === "ENOTSUP" || code === "EOPNOTSUPP";
}

export function hardLinkRequired(filePath: string): Error {
  return new Error(
    `The filesystem does not support hard links; refusing to create or replace ${filePath} without overwrite protection.`,
  );
}

export async function writeFileAtomically(
  filePath: string,
  content: Uint8Array,
  expectedFingerprint?: string | null,
  captureDirectory?: string,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  try {
    const handle = await fs.open(temporary, "wx");
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    if (expectedFingerprint === undefined) {
      await retryOnSharingViolation(() => fs.rename(temporary, filePath));
      return;
    }
    if (expectedFingerprint === null) {
      try {
        await retryOnSharingViolation(() => fs.link(temporary, filePath));
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EEXIST")
          throw new Error(`Content changed during apply: ${filePath}`);
        if (isHardLinkUnsupported(code)) throw hardLinkRequired(filePath);
        throw error;
      }
    }
    const captureRoot = captureDirectory ?? path.dirname(filePath);
    await fs.mkdir(captureRoot, { recursive: true });
    const captured = path.join(captureRoot, `${randomUUID()}.capture`);
    try {
      await retryOnSharingViolation(() => fs.rename(filePath, captured));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new Error(`Content changed during apply: ${filePath}`);
      throw error;
    }
    let actual: string;
    try {
      actual = fingerprint(await fs.readFile(captured));
    } catch (error) {
      await restoreCapturedFile(filePath, captured).catch(() => undefined);
      throw error;
    }
    if (actual !== expectedFingerprint) {
      await restoreCapturedFile(filePath, captured);
      throw new Error(`Content changed during apply: ${filePath}`);
    }
    try {
      await retryOnSharingViolation(() => fs.link(temporary, filePath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        await restoreCapturedFile(filePath, captured);
        throw new Error(`Content changed during apply: ${filePath}`);
      }
      await restoreCapturedFile(filePath, captured).catch(() => undefined);
      if (isHardLinkUnsupported(code)) throw hardLinkRequired(filePath);
      throw error;
    }
    await retryOnSharingViolation(() => fs.rm(captured, { force: true })).catch(
      () => undefined,
    );
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export async function removeFileIfUnchanged(
  target: string,
  expected: string | null,
  journalDirectory: string,
  logicalPath: string,
): Promise<void> {
  if (expected === null)
    throw new Error(`Content changed during apply: ${logicalPath}`);
  const captureDirectory = path.join(journalDirectory, "quarantine");
  await fs.mkdir(captureDirectory, { recursive: true });
  const captured = path.join(captureDirectory, `${randomUUID()}.capture`);
  try {
    await retryOnSharingViolation(() => fs.rename(target, captured));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(`Content changed during apply: ${logicalPath}`);
    throw error;
  }
  if (fingerprint(await fs.readFile(captured)) !== expected) {
    await restoreCapturedFile(target, captured);
    throw new Error(`Content changed during apply: ${logicalPath}`);
  }
  await retryOnSharingViolation(() => fs.rm(captured, { force: true }));
}

export async function writeJsonAtomically(
  filePath: string,
  value: unknown,
): Promise<void> {
  await writeFileAtomically(
    filePath,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
  );
}

export function updateFrontmatter(
  source: FileState,
  set: Readonly<Record<string, unknown>> | undefined,
  remove: readonly string[] | undefined,
): FileState {
  let text: string;
  try {
    text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(source.content);
  } catch {
    throw new Error("The Markdown file is not valid UTF-8.");
  }
  const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom ? text.slice(1) : text;
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(body);
  if (!match) throw new Error("The Markdown file has no YAML frontmatter.");
  const document = parseDocument(match[2]);
  if (document.errors.length > 0)
    throw new Error(`Invalid YAML frontmatter: ${document.errors[0]?.message}`);
  for (const [key, value] of Object.entries(set ?? {}))
    document.setIn(key.split("."), value);
  for (const key of remove ?? []) document.deleteIn(key.split("."));
  return stateOf(
    `${bom}${match[1]}${document.toString().trimEnd()}${match[3]}${body.slice(match[0].length)}`,
  );
}
