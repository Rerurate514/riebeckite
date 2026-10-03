import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildImages } from "../scripts/build_images";

test("buildImages copies only public referenced assets and removes stale outputs", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "riebeckite-build-images-"),
  );
  test.after(() => rm(root, { recursive: true, force: true }));
  const contentDir = path.join(root, "content");
  const assetsRoot = path.join(root, "public");

  await writeFixture(contentDir, "index.md", publishedNote("images/live.png"));
  await writeFixture(contentDir, "images/live.png", "LIVE-V1");
  await writeFixture(contentDir, "fixtures/test-only.png", "TEST-ONLY");
  await writeFixture(contentDir, "attachments/report.pdf", "REPORT");
  await writeFixture(assetsRoot, "images/stale.png", "STALE");
  await writeFixture(assetsRoot, "images/debug.json", "DEBUG");
  await writeFixture(assetsRoot, "logo.png", "LOGO");

  await buildImages({ contentDir, assetsRoot, exclude: [] });

  assert.equal(await readText(assetsRoot, "images/live.png"), "LIVE-V1");
  assert.equal(await exists(assetsRoot, "fixtures/test-only.png"), false);
  assert.equal(await exists(assetsRoot, "images/stale.png"), false);
  assert.equal(await readText(assetsRoot, "images/debug.json"), "DEBUG");
  assert.equal(await readText(assetsRoot, "logo.png"), "LOGO");
  assert.equal(
    await readText(assetsRoot, "assets/attachments/attachments/report.pdf"),
    "REPORT",
  );

  await writeFixture(contentDir, "images/live.png", "LIVE-V2");
  await writeFixture(contentDir, "index.md", publishedNote("images/added.png"));
  await writeFixture(contentDir, "images/added.png", "ADDED");

  await buildImages({ contentDir, assetsRoot, exclude: [] });

  assert.equal(await exists(assetsRoot, "images/live.png"), false);
  assert.equal(await readText(assetsRoot, "images/added.png"), "ADDED");
});

function publishedNote(imagePath: string): string {
  return `---\npublish: true\n---\n\n![[${imagePath}]]\n![[attachments/report.pdf]]\n`;
}

async function writeFixture(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const file = path.join(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function readText(root: string, relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

async function exists(root: string, relativePath: string): Promise<boolean> {
  try {
    await readFile(path.join(root, relativePath));
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      return error.code !== "ENOENT";
    }
    throw error;
  }
}
