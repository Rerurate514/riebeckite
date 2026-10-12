import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type Frontmatter = Readonly<
  Record<string, string | number | boolean | readonly string[]>
>;

function frontmatterValue(value: Frontmatter[string]): string {
  if (Array.isArray(value))
    return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  return String(value);
}

export function markdown(body: string, frontmatter?: Frontmatter): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return body;
  const fields = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${frontmatterValue(value)}`)
    .join("\n");
  return `---\n${fields}\n---\n\n${body}`;
}

export async function withTemporaryDirectory<T>(
  prefixOrCallback: string | ((directory: string) => Promise<T>),
  callback?: (directory: string) => Promise<T>,
): Promise<T> {
  const prefix =
    typeof prefixOrCallback === "string"
      ? prefixOrCallback
      : "riebeckite-test-";
  const operation =
    typeof prefixOrCallback === "function" ? prefixOrCallback : callback;
  if (!operation) throw new Error("A temporary directory callback is required");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await operation(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}
