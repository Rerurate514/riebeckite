import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  loadOutputCache,
  saveOutputCache,
  shouldApplyRiebeckiteSsg,
} from "../src/ssg_plugin.js";

test("riebeckite SSG is disabled for the HonoX client build", () => {
  assert.equal(
    shouldApplyRiebeckiteSsg({}, { command: "build", mode: "client" }),
    false,
  );
});

test("riebeckite SSG is enabled for the normal production build", () => {
  assert.equal(
    shouldApplyRiebeckiteSsg({}, { command: "build", mode: "production" }),
    true,
  );
});

test("riebeckite SSG is disabled during dev server", () => {
  assert.equal(
    shouldApplyRiebeckiteSsg({}, { command: "serve", mode: "development" }),
    false,
  );
});

test("malformed SSG output cache falls back instead of throwing", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");

  for (const body of [
    "not json",
    JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 1, outputs: null }),
    JSON.stringify({ version: 1, outputs: { "index.html": null } }),
    JSON.stringify({
      version: 1,
      outputs: { "index.html": { source: 1, encoding: "utf8" } },
    }),
    JSON.stringify({
      version: 1,
      outputs: { "index.html": { source: "", encoding: "raw" } },
    }),
  ]) {
    await fs.writeFile(cachePath, body, "utf8");
    assert.equal(await loadOutputCache(cachePath), undefined);
  }
});

test("valid SSG output cache round-trips string and binary outputs", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");
  const state = {
    version: 1 as const,
    outputs: {
      "index.html": { source: "<h1>ok</h1>", encoding: "utf8" as const },
      "assets/a.bin": {
        source: Buffer.from([1, 2, 3]).toString("base64"),
        encoding: "base64" as const,
      },
    },
  };

  await saveOutputCache(cachePath, state);

  assert.deepEqual(await loadOutputCache(cachePath), state);
});
