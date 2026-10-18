import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFile,
  cp,
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

test("SSG adapter preserves client assets without treating them as routes", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "adapter-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "Adapter",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    stylesheet: "body { color: red; }\n",
  });

  await buildSite(site, "cold", { stylesheet: true });
  const coldIndex = await readFile(
    path.join(distPath(site), "index.html"),
    "utf8",
  );
  const stylesheet = coldIndex.match(/<link[^>]+href="\/([^"\n]+\.css)"/u)?.[1];
  assert.ok(
    stylesheet,
    `index.html must link a client stylesheet: ${coldIndex}`,
  );
  const coldStylesheet = await readFile(
    path.join(distPath(site), stylesheet),
    "utf8",
  );

  await buildSite(site, "no-change", { stylesheet: true });

  assert.equal(
    await readFile(path.join(distPath(site), "index.html"), "utf8"),
    coldIndex,
    "an existing dist must not become adapter static-route input",
  );
  assert.equal(
    await readFile(path.join(distPath(site), stylesheet), "utf8"),
    coldStylesheet,
    "the client build stylesheet must survive the SSG build",
  );
});

test("SSG output links the manifest-resolved stylesheet on regular and README pages", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "stylesheet-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "Stylesheet",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    stylesheet: "body { color: red; }\n",
    readme: true,
  });

  await buildSite(site, "cold", {
    stylesheet: true,
  });

  for (const output of ["index.html", "README.html", "notes/note-0.html"]) {
    const html = await readFile(path.join(distPath(site), output), "utf8");
    const stylesheet = html.match(/<link[^>]+href="\/([^"\n]+\.css)"/u)?.[1];
    assert.ok(stylesheet, `${output}: ${html}`);
    await readFile(path.join(distPath(site), stylesheet));
  }
  await readFile(path.join(distPath(site), ".vite", "manifest.json"));

  const noChangeMetrics = await incrementalBuild(site, "no-change", {
    stylesheet: true,
  });
  assert.equal(noChangeMetrics.fullRegenerationRequired, false);
  assert.ok(Number(noChangeMetrics.reusedOutputCount) > 0);

  await appendFile(notePath(site, 0), "\nEdited stylesheet note.\n", "utf8");
  const contentChangeMetrics = await incrementalBuild(site, "content-change", {
    stylesheet: true,
  });
  assert.equal(contentChangeMetrics.fullRegenerationRequired, false);
  assert.ok(Number(contentChangeMetrics.affectedOutputCount) > 0);
  assert.match(
    await readFile(path.join(distPath(site), "notes/note-0.html"), "utf8"),
    /Edited stylesheet note/u,
  );
});

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

test("Bases incremental SSG output matches an independent clean build", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "bases-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const mutate = [
    (_site: string) => Promise.resolve(),
    (site: string) => replaceBase(site, "* 2", "* 3"),
    (site: string) => replaceBase(site, "DESC", "ASC"),
    (site: string) =>
      replaceBase(
        site,
        "group, direction: ASC",
        "formula.rank, direction: DESC",
      ),
    (site: string) => replaceBase(site, "total }", "Sum }"),
    (site: string) => replaceNote(site, "value: 2", "value: 3"),
    (site: string) =>
      writeFile(
        path.join(site, "vault", "notes", "added.md"),
        publicNote("Added", 4, "beta"),
      ),
    (site: string) => rm(path.join(site, "vault", "notes", "public.md")),
    (site: string) =>
      replaceNote(site, "visibility: public", "visibility: draft"),
    (site: string) =>
      replaceNote(site, "visibility: draft", "visibility: public", "draft.md"),
    (site: string) =>
      replaceNote(site, "visibility: public", "visibility: unlisted"),
    (site: string) =>
      replaceNote(
        site,
        "visibility: unlisted",
        "visibility: public",
        "unlisted.md",
      ),
    (site: string) => rm(path.join(site, "vault", "views", "Matrix.base")),
  ];
  for (const [index, apply] of mutate.entries()) {
    const inc = path.join(root, `incremental-${index}`);
    await createBasesSite(inc);
    await buildSite(inc, "initial", leanBuildOptions);
    await apply(inc);
    const metrics = await incrementalBuild(
      inc,
      "incremental",
      leanBuildOptions,
    );
    const incremental = await snapshotTree(distPath(inc));
    const clean = path.join(root, `clean-${index}`);
    await cp(inc, clean, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(inc, source);
        return relative !== ".riebeckite" && relative !== "dist";
      },
    });
    await buildSite(clean, "clean", leanBuildOptions);
    const rebuilt = await snapshotTree(distPath(clean));
    assert.deepEqual(
      snapshotHashes(incremental),
      snapshotHashes(rebuilt),
      `SHA-256 output inventory mismatch for scenario ${index}`,
    );
    assert.deepEqual(
      diffSnapshotKeys(incremental, rebuilt),
      [],
      `scenario ${index}`,
    );
    assert.equal(
      new Set(Object.keys(incremental)).size,
      Object.keys(incremental).length,
    );
    assert.doesNotMatch(
      await readFile(
        path.join(inc, "dist", "views", "Matrix.html"),
        "utf8",
      ).catch(() => ""),
      /999999|888888|777777/,
    );
    assert.equal(Number(metrics.reusedOutputCount) >= 0, true);
    assert.equal(Number(metrics.renderedOutputCount) >= 0, true);
    assert.equal(Number(metrics.deletedOutputCount) >= 0, true);
    if (index === 0) assert.ok(Number(metrics.reusedOutputCount) > 0);
    if (index === 7 || index === 12)
      assert.ok(Number(metrics.deletedOutputCount) >= 1);
  }
});

async function createBasesSite(site: string): Promise<void> {
  await createSite(site, {
    title: "Bases",
    renderTag: "v1",
    noteCount: 0,
    editedNotes: [],
    bases: true,
  });
  await mkdir(path.join(site, "vault", "views"), { recursive: true });
  await writeFile(
    path.join(site, "vault", "index.md"),
    "---\nvisibility: public\n---\n\n![[views/Matrix.base]]\n",
  );
  await writeFile(
    path.join(site, "vault", "views", "Matrix.base"),
    "formulas:\n  rank: note.value * 2\nsummaries:\n  total: values.reduce(acc + value, 0)\nproperties:\n  file.name: Name\n  group: Group\n  formula.rank: Rank\nviews:\n  - type: table\n    order: [file.name, group, formula.rank]\n    sort: [{ property: formula.rank, direction: DESC }]\n    groupBy: { property: group, direction: ASC }\n    summaries: { formula.rank: total }\n",
  );
  await mkdir(path.join(site, "vault", "notes"), { recursive: true });
  await writeFile(
    path.join(site, "vault", "notes", "public.md"),
    publicNote("Public", 2, "alpha"),
  );
  await writeFile(
    path.join(site, "vault", "notes", "draft.md"),
    publicNote("Draft", 999999, "secret", "draft"),
  );
  await writeFile(
    path.join(site, "vault", "notes", "unlisted.md"),
    publicNote("Unlisted", 888888, "secret", "unlisted"),
  );
  await writeFile(
    path.join(site, "vault", "notes", "scheduled.md"),
    "---\ntitle: Scheduled\nvisibility: public\npublishAt: 2999-01-01T00:00:00.000Z\nvalue: 777777\ngroup: secret\n---\n\n# Scheduled\n",
  );
}

function snapshotHashes(snapshot: Readonly<Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([file, content]) => [
      file,
      createHash("sha256").update(Buffer.from(content, "base64")).digest("hex"),
    ]),
  );
}

function publicNote(
  title: string,
  value: number,
  group: string,
  visibility = "public",
): string {
  return `---\ntitle: ${title}\nvisibility: ${visibility}\nvalue: ${value}\ngroup: ${group}\n---\n\n# ${title}\n`;
}

async function replaceBase(
  site: string,
  from: string,
  to: string,
): Promise<void> {
  const file = path.join(site, "vault", "views", "Matrix.base");
  await writeFile(file, (await readFile(file, "utf8")).replace(from, to));
}

async function replaceNote(
  site: string,
  from: string,
  to: string,
  name = "public.md",
): Promise<void> {
  const file = path.join(site, "vault", "notes", name);
  await writeFile(file, (await readFile(file, "utf8")).replace(from, to));
}

test("SSG emits standard Markdown images and tracks their file changes", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "markdown-image-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await createSite(root, {
    title: "Markdown image",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
  });
  await writeFile(
    notePath(root, 0),
    [
      "---",
      "title: Image note",
      "visibility: public",
      "---",
      "",
      "![Sample](./images/sample.png)",
      "",
    ].join("\\n"),
  );
  const imagePath = path.join(root, "vault", "notes", "images", "sample.png");
  await mkdir(path.dirname(imagePath), { recursive: true });
  await writeFile(imagePath, "IMAGE-A", "utf8");

  await buildSite(root, "initial-image", leanBuildOptions);
  assert.equal(
    await readFile(
      path.join(distPath(root), "notes", "images", "sample.png"),
      "utf8",
    ),
    "IMAGE-A",
  );
  assert.match(
    await readFile(path.join(distPath(root), "notes", "note-0.html"), "utf8"),
    /src="\/notes\/images\/sample\.png"/,
  );

  await writeFile(imagePath, "IMAGE-B", "utf8");
  await incrementalBuild(root, "updated-image", leanBuildOptions);
  assert.equal(
    await readFile(
      path.join(distPath(root), "notes", "images", "sample.png"),
      "utf8",
    ),
    "IMAGE-B",
  );

  await rm(imagePath);
  await incrementalBuild(root, "removed-image", leanBuildOptions);
  await assert.rejects(
    readFile(path.join(distPath(root), "notes", "images", "sample.png")),
  );
});
