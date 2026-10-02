import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileSystemContentSource } from "../src/content/file_system_content_source.js";

test("file-system content source skips internal metadata and tool directories", async () => {
  const root = await makeTempContentDirectory();
  await writeFile(root, "index.md", "---\npublish: true\n---\n\n# Home");
  await writeFile(root, "notes/keep.md", "---\npublish: true\n---\n\n# Keep");
  await writeFile(root, "attachments/sample.png", new Uint8Array([137, 80]));
  await writeFile(
    root,
    ".obsidian/app.json",
    "RIEBECKITE_OBSIDIAN_PRIVATE_TEST",
  );
  await writeFile(root, ".git/config", "[remote]\nurl = private");
  await writeFile(root, ".github/workflows/deploy.yml", "secret-ish workflow");
  await writeFile(root, "node_modules/pkg/index.md", "# dependency");
  await writeFile(root, ".DS_Store", "metadata");
  await writeFile(root, "nested/Thumbs.db", "metadata");
  await writeFile(root, "nested/desktop.ini", "metadata");

  const source = new FileSystemContentSource(root);
  const paths = (await source.scan()).map((entry) => entry.path).sort();

  assert.deepEqual(paths, [
    "attachments/sample.png",
    "index.md",
    "notes/keep.md",
  ]);
});

test("file-system content source keeps vault content directories and user excludes", async () => {
  const root = await makeTempContentDirectory();
  await writeFile(root, "index.md", "---\npublish: true\n---\n\n# Home");
  await writeFile(root, "attachments/sample.png", new Uint8Array([137, 80]));
  await writeFile(root, "Archive/old.md", "---\npublish: true\n---\n\n# Old");
  await writeFile(
    root,
    "Templates/page.md",
    "---\npublish: true\n---\n\n# Template",
  );
  await writeFile(
    root,
    "drafts/hidden.md",
    "---\npublish: true\n---\n\n# Hidden",
  );

  const source = new FileSystemContentSource(root, ["drafts/**"]);
  const paths = (await source.scan()).map((entry) => entry.path).sort();

  assert.deepEqual(paths, [
    "Archive/old.md",
    "Templates/page.md",
    "attachments/sample.png",
    "index.md",
  ]);
});

async function makeTempContentDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-content-"));
}

async function writeFile(
  root: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const filePath = path.join(root, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
