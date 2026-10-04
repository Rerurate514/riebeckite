import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  FileSystemContentSource,
  isIgnoredContentPath,
  matchContentExcludePattern,
} from "../src/content/file_system_content_source.js";

test("isIgnoredContentPath covers internal metadata and user excludes", () => {
  assert.equal(isIgnoredContentPath("notes/keep.md"), false);
  assert.equal(isIgnoredContentPath("attachments/sample.png"), false);
  assert.equal(isIgnoredContentPath(".obsidian/workspace.json"), true);
  assert.equal(isIgnoredContentPath(".git/config"), true);
  assert.equal(isIgnoredContentPath(".github/workflows/deploy.yml"), true);
  assert.equal(isIgnoredContentPath("node_modules/pkg/index.md"), true);
  assert.equal(isIgnoredContentPath(".DS_Store"), true);
  assert.equal(isIgnoredContentPath("nested/Thumbs.db"), true);
  assert.equal(isIgnoredContentPath("nested/desktop.ini"), true);
  assert.equal(isIgnoredContentPath("drafts/secret.md", ["drafts/**"]), true);
  assert.equal(isIgnoredContentPath("private/secret.md", ["private/**"]), true);
  assert.equal(isIgnoredContentPath("private", ["private"]), true);
  assert.equal(isIgnoredContentPath("private.md", ["private"]), true);
  assert.equal(isIgnoredContentPath("published/note.md", ["private"]), false);
});

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

test("matchContentExcludePattern reports the matching pattern", () => {
  assert.equal(
    matchContentExcludePattern("drafts/secret.md", ["drafts/**"]),
    "drafts/**",
  );
  assert.equal(
    matchContentExcludePattern("private.md", ["private"]),
    "private",
  );
  assert.equal(
    matchContentExcludePattern("notes/keep.md", ["private"]),
    undefined,
  );
  assert.equal(matchContentExcludePattern(".git/config", []), undefined);
});

test("file-system content source reports which entries user excludes removed", async () => {
  const root = await makeTempContentDirectory();
  await writeFile(root, "index.md", "---\npublish: true\n---\n\n# Home");
  await writeFile(root, "drafts/hidden.md", "# Hidden");
  await writeFile(root, "private/secret.md", "# Secret");
  await writeFile(root, ".git/config", "private");

  const source = new FileSystemContentSource(root, ["drafts/**", "private/**"]);
  const { entries, exclusions } = await source.scanWithExclusions();

  assert.deepEqual(entries.map((entry) => entry.path).sort(), ["index.md"]);
  assert.deepEqual(
    [...exclusions].sort((left, right) => left.path.localeCompare(right.path)),
    [
      { path: "drafts/hidden.md", pattern: "drafts/**" },
      { path: "private/secret.md", pattern: "private/**" },
    ],
  );
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
