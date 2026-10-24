import assert from "node:assert/strict";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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
    noteCount: 2,
    editedNotes: [],
    visualRenderers: true,
  });
  await appendFile(notePath(site, 0), visualRendererSource, "utf8");
  await writeFile(
    path.join(site, "vault", "notes", "deck.md"),
    "---\ntitle: Deck\nvisibility: public\nmarp: true\n---\n\n# One\n\n---\n\n# Two\n",
    "utf8",
  );

  await buildSite(site, "cold", leanBuildOptions);
  const cold = await snapshotTree(distPath(site));
  const coldOutputCache = await readFile(cachePath(site), "utf8");

  assert.ok(Object.hasOwn(cold, "notes/note-0.html"));
  assert.ok(Object.hasOwn(cold, "slides/notes/deck/index.html"));
  assert.ok(Object.hasOwn(cold, "search-data.json"));
  const slideHtml = await readFile(
    path.join(distPath(site), "slides/notes/deck/index.html"),
    "utf8",
  );
  assert.match(slideHtml, /rb-marp-slides/u);
  assert.match(slideHtml, /data-marpit-svg/u);
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
  await assertIncrementalMatchesCold(site, "body-edit");

  await appendFile(notePath(site, 0), "\n[Linked note](./note-1.md)\n", "utf8");
  await assertIncrementalMatchesCold(site, "link-edit");

  await writeFile(
    path.join(site, "vault", "notes", "added.md"),
    "---\ntitle: Added\nvisibility: public\n---\n\n# Added\n\nSearchable added note.\n",
    "utf8",
  );
  await assertIncrementalMatchesCold(site, "add");

  await rm(path.join(site, "vault", "notes", "added.md"));
  await assertIncrementalMatchesCold(site, "delete");

  await updateVisibility(site, 0, "public", "draft");
  await assertIncrementalMatchesCold(site, "public-to-draft");
  const draftSnapshot = await snapshotTree(distPath(site));
  assert.equal(Object.hasOwn(draftSnapshot, "notes/note-0.html"), false);
  assert.doesNotMatch(
    await readFile(path.join(distPath(site), "search-data.json"), "utf8"),
    /Deterministic diagram/u,
  );

  await appendFile(notePath(site, 0), "\nDraft-only renderer body.\n", "utf8");
  await assertIncrementalMatchesCold(site, "draft-body-edit");
  assert.equal(
    Object.hasOwn(await snapshotTree(distPath(site)), "notes/note-0.html"),
    false,
  );

  await updateVisibility(site, 0, "draft", "public");
  await assertIncrementalMatchesCold(site, "draft-to-public");
  const publicSnapshot = await snapshotTree(distPath(site));
  assert.equal(Object.hasOwn(publicSnapshot, "notes/note-0.html"), true);
  assert.match(
    await readFile(path.join(distPath(site), "notes", "note-0.html"), "utf8"),
    /Draft-only renderer body/u,
  );

  await updateVisibility(site, 0, "public", "unlisted");
  await assertIncrementalMatchesCold(site, "public-to-unlisted");
  assert.equal(
    Object.hasOwn(await snapshotTree(distPath(site)), "notes/note-0.html"),
    true,
  );
  assert.doesNotMatch(
    await readFile(path.join(distPath(site), "search-data.json"), "utf8"),
    /Deterministic diagram|Draft-only renderer body/u,
  );
});

const visualRendererSource =
  "\n```d2\na -> b: Deterministic diagram\n```\n\n```marp\n# Deterministic deck\n\n---\n\n## Slide two\n```\n";

async function assertIncrementalMatchesCold(
  site: string,
  label: string,
): Promise<void> {
  const incremental = await incrementalBuild(site, label, leanBuildOptions);
  assert.equal(incremental.fullRegenerationRequired, false);
  const incrementalSnapshot = await snapshotTree(distPath(site));
  const incrementalOutputCache = await readFile(cachePath(site), "utf8");

  await removePersistentBuildState(site);
  await buildSite(site, `cold-after-${label}`, leanBuildOptions);
  assert.deepEqual(
    diffSnapshotKeys(incrementalSnapshot, await snapshotTree(distPath(site))),
    [],
    `${label}: incremental D2 and Marp output must equal a clean cold build`,
  );
  assert.equal(await readFile(cachePath(site), "utf8"), incrementalOutputCache);
}

async function updateVisibility(
  site: string,
  index: number,
  from: string,
  to: string,
): Promise<void> {
  const file = notePath(site, index);
  await writeFile(
    file,
    (await readFile(file, "utf8")).replace(from, to),
    "utf8",
  );
}

async function removePersistentBuildState(site: string): Promise<void> {
  await rm(path.join(site, ".riebeckite"), { recursive: true, force: true });
  await rm(path.join(site, "vault", ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await rm(distPath(site), { recursive: true, force: true });
}
