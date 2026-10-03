import assert from "node:assert/strict";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  cachePath,
  configSource,
  createSite,
  diffSnapshotKeys,
  distPath,
  incrementalBuild,
  notePath,
  renderSource,
  type SiteSources,
  snapshotTree,
  workParent,
  writeNote,
} from "./support/ssg_site.js";

const leanBuildOptions = { adapter: false } as const;

test("incremental SSG matches a clean cold build", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "incremental-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const inc = path.join(root, "inc");
  let sources: SiteSources = {
    title: "Incremental",
    renderTag: "v1",
    noteCount: 2,
    editedNotes: [],
  };
  await createSite(inc, sources);

  const coldMetrics = await buildSite(inc, "cold", leanBuildOptions);
  const coldSnapshot = await snapshotTree(distPath(inc));
  assert.equal(coldMetrics.fullRegenerationRequired, true);
  for (const required of [
    "index.html",
    "feed.xml",
    "archive/first.html",
    "404.html",
    "notes/note-0.html",
    "notes/note-1.html",
    "explore.html",
    "custom.json",
  ]) {
    assert.ok(
      Object.hasOwn(coldSnapshot, required),
      `cold build missing ${required}`,
    );
  }
  const coldCache = JSON.parse(await readFile(cachePath(inc), "utf8")) as {
    appFingerprint?: string;
    outputs: Record<string, unknown>;
  };
  assert.equal(typeof coldCache.appFingerprint, "string");
  assert.ok(Object.hasOwn(coldCache.outputs, "index.html"));
  assert.ok(Object.hasOwn(coldCache.outputs, "custom.json"));

  await rm(path.join(inc, ".riebeckite"), { recursive: true, force: true });
  await rm(path.join(inc, "vault", ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await rm(distPath(inc), { recursive: true, force: true });
  await buildSite(inc, "cold-again", leanBuildOptions);
  const coldAgainSnapshot = await snapshotTree(distPath(inc));
  assert.deepEqual(
    diffSnapshotKeys(coldSnapshot, coldAgainSnapshot),
    [],
    "two clean cold builds must be byte-identical",
  );

  async function compareAgainstColdBuild(
    label: string,
  ): Promise<Record<string, string>> {
    const incremental = await snapshotTree(distPath(inc));
    await rm(path.join(inc, ".riebeckite"), { recursive: true, force: true });
    await rm(path.join(inc, "vault", ".riebeckite"), {
      recursive: true,
      force: true,
    });
    await rm(distPath(inc), { recursive: true, force: true });
    await buildSite(inc, `cold-after-${label}`, leanBuildOptions);
    const rebuilt = await snapshotTree(distPath(inc));
    assert.deepEqual(
      diffSnapshotKeys(incremental, rebuilt),
      [],
      `${label}: incremental dist must equal a clean cold dist`,
    );
    return rebuilt;
  }

  async function assertMatchesColdBuild(
    reference: Record<string, string>,
    label: string,
  ): Promise<void> {
    const incremental = await snapshotTree(distPath(inc));
    assert.deepEqual(
      diffSnapshotKeys(incremental, reference),
      [],
      `${label}: incremental dist must equal a clean cold dist`,
    );
  }

  await rm(distPath(inc), { recursive: true, force: true });
  const noChangeMetrics = await buildSite(inc, "no-change", leanBuildOptions);
  assert.deepEqual(await snapshotTree(distPath(inc)), coldSnapshot);
  assert.equal(noChangeMetrics.fullRegenerationRequired, false);
  assert.equal(noChangeMetrics.affectedOutputCount, 0);
  assert.equal(noChangeMetrics.unchangedOutputCount, sources.noteCount + 2);
  assert.equal(
    noChangeMetrics.reusedOutputCount,
    noChangeMetrics.unchangedOutputCount,
  );
  assert.equal(noChangeMetrics.skippedRouteCount, sources.noteCount + 1);

  await appendFile(notePath(inc, 0), "\nEdited note 0.\n", "utf8");
  sources = { ...sources, editedNotes: [0] };
  const editMetrics = await incrementalBuild(inc, "edit", leanBuildOptions);
  const stateAfterEditCold = await compareAgainstColdBuild("edit");
  assert.equal(editMetrics.fullRegenerationRequired, false);
  assert.equal(editMetrics.affectedOutputCount, 3);
  assert.equal(editMetrics.reusedOutputCount, editMetrics.unchangedOutputCount);

  const frontmatterPath = notePath(inc, 1);
  await writeFile(
    frontmatterPath,
    (await readFile(frontmatterPath, "utf8")).replace(
      "title: Note 1",
      "title: Renamed frontmatter note",
    ),
  );
  const frontmatterMetrics = await incrementalBuild(
    inc,
    "frontmatter-edit",
    leanBuildOptions,
  );
  await compareAgainstColdBuild("frontmatter-edit");
  assert.equal(frontmatterMetrics.fullRegenerationRequired, false);

  await writeNote(inc, sources.noteCount, false);
  sources = { ...sources, noteCount: sources.noteCount + 1 };
  const addMetrics = await incrementalBuild(inc, "add", leanBuildOptions);
  await compareAgainstColdBuild("add");
  assert.equal(addMetrics.fullRegenerationRequired, false);
  assert.equal(addMetrics.affectedOutputCount, 3);

  await rm(notePath(inc, sources.noteCount - 1));
  sources = {
    ...sources,
    noteCount: sources.noteCount - 1,
    editedNotes: sources.editedNotes.filter(
      (index) => index < sources.noteCount - 1,
    ),
  };
  const deleteMetrics = await incrementalBuild(inc, "delete", leanBuildOptions);
  await assertMatchesColdBuild(stateAfterEditCold, "delete");
  assert.equal(deleteMetrics.fullRegenerationRequired, false);
  assert.ok(Number(deleteMetrics.removedOutputCount) >= 1);

  const renamedPath = path.join(inc, "vault", "notes", "renamed-note.md");
  await rename(notePath(inc, 0), renamedPath);
  const renameMetrics = await incrementalBuild(inc, "rename", leanBuildOptions);
  await compareAgainstColdBuild("rename");
  assert.equal(renameMetrics.fullRegenerationRequired, false);
  assert.ok(Number(renameMetrics.removedOutputCount) >= 1);

  await writeFile(path.join(inc, "app", "render.ts"), renderSource("v2"));
  sources = { ...sources, renderTag: "v2" };
  const appMetrics = await incrementalBuild(
    inc,
    "app-change",
    leanBuildOptions,
  );
  await compareAgainstColdBuild("app-change");
  assert.equal(appMetrics.fullRegenerationRequired, true);

  await writeFile(
    path.join(inc, "riebeckite.config.ts"),
    configSource(inc, { ...sources, title: "Changed" }),
  );
  sources = { ...sources, title: "Changed" };
  const configMetrics = await incrementalBuild(
    inc,
    "config-change",
    leanBuildOptions,
  );
  const stateAfterConfigChangeCold =
    await compareAgainstColdBuild("config-change");
  assert.equal(configMetrics.fullRegenerationRequired, true);

  await rm(cachePath(inc), { force: true });
  const missingMetrics = await incrementalBuild(
    inc,
    "missing-cache",
    leanBuildOptions,
  );
  await assertMatchesColdBuild(stateAfterConfigChangeCold, "missing-cache");
  assert.equal(missingMetrics.fullRegenerationRequired, true);

  await writeFile(cachePath(inc), "{ not valid json", "utf8");
  const malformedMetrics = await incrementalBuild(
    inc,
    "malformed-cache",
    leanBuildOptions,
  );
  await assertMatchesColdBuild(stateAfterConfigChangeCold, "malformed-cache");
  assert.equal(malformedMetrics.fullRegenerationRequired, true);

  await writeNote(inc, sources.noteCount, false);
  sources = { ...sources, noteCount: sources.noteCount + 1 };
  await buildSite(inc, "stale-prep", leanBuildOptions);
  const removedNoteIndex = sources.noteCount - 1;
  await rm(notePath(inc, removedNoteIndex));
  sources = {
    ...sources,
    noteCount: sources.noteCount - 1,
    editedNotes: sources.editedNotes.filter(
      (index) => index < removedNoteIndex,
    ),
  };
  await writeFile(path.join(distPath(inc), "stray.txt"), "keep", "utf8");
  const staleMetrics = await buildSite(inc, "stale-delete", {
    adapter: false,
    emptyOutDir: false,
  });
  const staleSnapshot = await snapshotTree(distPath(inc));
  assert.ok(
    !Object.hasOwn(staleSnapshot, `notes/note-${removedNoteIndex}.html`),
    "incremental build must delete removed outputs from a populated dist",
  );
  assert.ok(
    Object.hasOwn(staleSnapshot, "stray.txt"),
    "a non-emptied dist must retain files the build does not own",
  );
  assert.ok(Number(staleMetrics.removedOutputCount) >= 1);

  const finalSnapshot = await snapshotTree(distPath(inc));
  assert.ok(Object.hasOwn(finalSnapshot, "index.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "404.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "explore.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "custom.json"));
});
