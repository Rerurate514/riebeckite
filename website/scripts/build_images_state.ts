import fs from "node:fs/promises";
import path from "node:path";
import { appRoot } from "./build_images_config.js";

const STATE_VERSION = 1;

type BuildImagesState = {
  version: 1;
  key: string;
  content: string;
  assets: string;
};

export function resolveBuildImagesStatePath(): string {
  return path.join(appRoot, ".riebeckite", "build-images-state.json");
}

export async function fingerprintTree(root: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(path.resolve(appRoot, root), {
      recursive: true,
      withFileTypes: true,
    });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name))
      .sort();
    const parts: string[] = [];
    const batchSize = 64;
    for (let index = 0; index < files.length; index += batchSize) {
      const batch = files.slice(index, index + batchSize);
      const stats = await Promise.all(
        batch.map(async (file) => {
          const stat = await fs.stat(file);
          return `${path
            .relative(path.resolve(appRoot, root), file)
            .replaceAll("\\", "/")}\0${stat.size}\0${stat.mtimeMs}`;
        }),
      );
      parts.push(...stats);
    }
    return parts.join("\n");
  } catch {
    return null;
  }
}

export async function readBuildImagesState(
  statePath: string,
  key: string,
): Promise<{ content: string; assets: string } | undefined> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(statePath, "utf8"),
    ) as Partial<BuildImagesState>;
    if (
      parsed.version !== STATE_VERSION ||
      parsed.key !== key ||
      typeof parsed.content !== "string" ||
      typeof parsed.assets !== "string"
    ) {
      return undefined;
    }
    return { content: parsed.content, assets: parsed.assets };
  } catch {
    return undefined;
  }
}

export async function writeBuildImagesState(
  statePath: string,
  key: string,
  content: string,
  assets: string,
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    await fs.writeFile(
      temporaryPath,
      JSON.stringify({
        version: STATE_VERSION,
        key,
        content,
        assets,
      } satisfies BuildImagesState),
    );
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    console.error("Failed to write build images state:", error);
  }
}
