import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CONTENT_BUILD_STATE_VERSION } from "../src/content/content_build_state.js";
import { loadContentBuildState } from "../src/content/content_build_state_store.js";

test("corrupted output state safely falls back to a cold content build", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-state-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, "content-state.json");

  for (const outputs of [
    {},
    [{ kind: "content", path: "a.html", producer: "content:a" }],
    [
      {
        kind: "content",
        path: "a.html",
        producer: "content:a",
        dependencies: [{ type: "content" }],
      },
    ],
    [
      {
        kind: "content",
        path: "../a.html",
        producer: "content:a",
        dependencies: [],
      },
    ],
  ]) {
    await fs.writeFile(
      statePath,
      JSON.stringify({
        version: CONTENT_BUILD_STATE_VERSION,
        entries: {},
        contentIndex: {},
        outputs,
      }),
      "utf8",
    );

    assert.equal(await loadContentBuildState(statePath), undefined);
  }
});

test("valid output state remains reusable", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-state-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, "content-state.json");
  const state = {
    version: CONTENT_BUILD_STATE_VERSION,
    entries: {},
    contentIndex: {},
    outputs: [
      {
        kind: "content",
        path: "a.html",
        producer: "content:a",
        dependencies: [
          { type: "content", slug: "a" },
          { type: "tag", tag: "tag" },
          { type: "folder", folder: "folder" },
          { type: "global" },
          { type: "unknown" },
        ],
      },
      {
        kind: "redirect",
        path: "old.html",
        producer: "content:a:redirect",
        dependencies: [],
      },
      {
        kind: "plugin-page",
        path: "explore/index.html",
        producer: "plugin:explore",
        dependencies: [],
      },
      {
        kind: "generated",
        path: "feed.xml",
        producer: "plugin:feed",
        dependencies: [],
      },
      {
        kind: "content",
        path: "~drafts.html",
        producer: "content:~drafts",
        dependencies: [],
      },
      {
        kind: "content",
        path: "C:note.html",
        producer: "content:C:note",
        dependencies: [],
      },
    ],
  };
  await fs.writeFile(statePath, JSON.stringify(state), "utf8");

  assert.deepEqual(await loadContentBuildState(statePath), state);
});

test("a state without output state remains compatible", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-state-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, "content-state.json");
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: CONTENT_BUILD_STATE_VERSION,
      entries: {},
      contentIndex: {},
    }),
    "utf8",
  );

  assert.deepEqual(await loadContentBuildState(statePath), {
    version: CONTENT_BUILD_STATE_VERSION,
    entries: {},
    contentIndex: {},
  });
});

test("an incompatible content build state safely falls back to a cold build", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-state-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, "content-state.json");
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: CONTENT_BUILD_STATE_VERSION + 1,
      entries: {},
      contentIndex: {},
    }),
    "utf8",
  );

  assert.equal(await loadContentBuildState(statePath), undefined);
});
