import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  createSite,
  distPath,
  incrementalBuild,
  snapshotTree,
  workParent,
} from "./support/ssg_site.js";

function readText(snapshot: Record<string, string>, key: string): string {
  const value = snapshot[key];
  assert.ok(value !== undefined, `dist is missing ${key}`);
  return Buffer.from(value, "base64").toString("utf8");
}

test("a collapsed folder page is not replaced by its own redirect stub", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "folder-pages-ssg-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "FolderPages",
    renderTag: "v1",
    noteCount: 0,
    editedNotes: [],
    folderPages: true,
  });
  const folder = path.join(site, "vault", "folder");
  await mkdir(folder, { recursive: true });
  const note = path.join(folder, "index.md");
  await writeFile(
    note,
    "---\ntitle: Folder\npublish: true\n---\n\n# Folder page\n",
    "utf8",
  );

  await buildSite(site, "folder-page");
  let snapshot = await snapshotTree(distPath(site));
  assert.match(readText(snapshot, "folder/index.html"), /Folder page/);
  assert.doesNotMatch(
    readText(snapshot, "folder/index.html"),
    /Redirecting to/,
  );

  await writeFile(
    note,
    "---\ntitle: Folder\npublish: true\n---\n\n# Folder page edited\n",
    "utf8",
  );
  await incrementalBuild(site, "folder-page-edit");
  snapshot = await snapshotTree(distPath(site));
  assert.match(readText(snapshot, "folder/index.html"), /Folder page edited/);
  assert.doesNotMatch(
    readText(snapshot, "folder/index.html"),
    /Redirecting to/,
  );
});
