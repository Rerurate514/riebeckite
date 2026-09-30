import fs from "node:fs";
import path from "node:path";

/** Predicate applied to each candidate file's absolute path. */
export type FilePredicate = (absolutePath: string) => boolean;

/**
 * Recursively list the files under `root` that satisfy `predicate`. Missing
 * roots yield an empty list instead of throwing.
 */
export function walkFiles(
  root: string,
  predicate: FilePredicate = () => true,
): string[] {
  const found: string[] = [];
  if (!fs.existsSync(root)) return found;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (predicate(full)) {
        found.push(full);
      }
    }
  }
  return found;
}
