import assert from "node:assert/strict";
import { appendFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  cachePath,
  createSite,
  diffSnapshotKeys,
  distPath,
  incrementalBuild,
  notePath,
  snapshotTree,
  workParent,
} from "./support/ssg_site.js";

const leanBuildOptions = { adapter: false } as const;

test("D2 and Marp outputs stay equal across cold and incremental SSG builds", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "visual-renderers-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "Visual renderers",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    visualRenderers: true,
  });
  await appendFile(
    notePath(site, 0),
    "\n```d2\na -> b: Deterministic diagram\n```\n\n```marp\n# Deterministic deck\n\n---\n\n## Slide two\n```\n",
    "utf8",
  );

  await buildSite(site, "cold", leanBuildOptions);
  const cold = await snapshotTree(distPath(site));
  const coldOutputCache = await readFile(cachePath(site), "utf8");

  assert.ok(Object.hasOwn(cold, "notes/note-0.html"));
  assert.ok(Object.hasOwn(cold, "search-data.json"));
  const noteHtml = await readFile(
    path.join(distPath(site), "notes/note-0.html"),
    "utf8",
  );
  assert.match(noteHtml, /<svg/u);
  assert.match(noteHtml, /rb-marp/u);
  assert.match(
    await readFile(path.join(distPath(site), "search-data.json"), "utf8"),
    /Deterministic diagram/u,
  );

  await removePersistentBuildState(site);
  await buildSite(site, "cold-again", leanBuildOptions);
  assert.deepEqual(
    diffSnapshotKeys(cold, await snapshotTree(distPath(site))),
    [],
    "two clean cold builds with D2, Marp, and search must be byte-identical",
  );
  assert.equal(await readFile(cachePath(site), "utf8"), coldOutputCache);

  await rm(distPath(site), { recursive: true, force: true });
  const noChange = await buildSite(site, "no-change", leanBuildOptions);
  assert.equal(noChange.fullRegenerationRequired, false);
  assert.deepEqual(
    diffSnapshotKeys(cold, await snapshotTree(distPath(site))),
    [],
    "a no-change incremental build must equal the cold build",
  );
  assert.equal(await readFile(cachePath(site), "utf8"), coldOutputCache);

  await appendFile(notePath(site, 0), "\nIncremental renderer edit.\n", "utf8");
  const edit = await incrementalBuild(site, "edit", leanBuildOptions);
  assert.equal(edit.fullRegenerationRequired, false);
  const incremental = await snapshotTree(distPath(site));
  const incrementalOutputCache = await readFile(cachePath(site), "utf8");

  await removePersistentBuildState(site);
  await buildSite(site, "cold-after-edit", leanBuildOptions);
  assert.deepEqual(
    diffSnapshotKeys(incremental, await snapshotTree(distPath(site))),
    [],
    "an incremental D2 and Marp edit must equal a clean cold build",
  );
  assert.equal(await readFile(cachePath(site), "utf8"), incrementalOutputCache);
});

async function removePersistentBuildState(site: string): Promise<void> {
  await rm(path.join(site, ".riebeckite"), { recursive: true, force: true });
  await rm(path.join(site, "vault", ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await rm(distPath(site), { recursive: true, force: true });
}
