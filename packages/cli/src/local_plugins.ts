import fs from "node:fs/promises";
import path from "node:path";

export async function listLocalPlugins(): Promise<readonly string[]> {
  const extensions = path.resolve(process.cwd(), "extensions");
  const entries = await fs
    .readdir(extensions, { withFileTypes: true })
    .catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    });
  const plugins: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^[a-z][a-z0-9-]{0,62}$/.test(entry.name)) continue;
    const indexPath = path.join(extensions, entry.name, "index.ts");
    const hasEntryPoint = await fs.stat(indexPath).then(
      (stats) => stats.isFile(),
      () => false,
    );
    if (hasEntryPoint) plugins.push(entry.name);
  }
  return plugins.sort((left, right) => left.localeCompare(right));
}
