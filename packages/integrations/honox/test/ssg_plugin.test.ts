import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  findBuildOutputSiteCollisions,
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

test("build outputs that collide with site public assets are reported", () => {
  assert.deepEqual(
    findBuildOutputSiteCollisions(
      ["index.js", "assets/app.txt", "index.html"],
      new Set(["index.js", "assets/app.txt", "favicon.ico"]),
    ),
    ["assets/app.txt", "index.js"],
  );
});

test("build outputs without site public assets report no collision", () => {
  assert.deepEqual(
    findBuildOutputSiteCollisions(
      ["index.js"],
      new Set(["favicon.ico", "assets/logo.png"]),
    ),
    [],
  );
});

test("malformed SSG output cache falls back instead of throwing", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");

  for (const body of [
    "not json",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ version: 2, outputs: null }),
    JSON.stringify({ version: 2, outputs: { "index.html": null } }),
    JSON.stringify({
      version: 2,
      outputs: { "index.html": { source: 1, encoding: "utf8" } },
    }),
    JSON.stringify({
      version: 2,
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
  const original = {
    outputs: {
      "index.html": "<h1>ok</h1>",
      "assets/a.bin": {
        source: Buffer.from([1, 2, 3]),
      },
    },
  };

  const state = {
    version: 2 as const,
    outputs: {
      "index.html": {
        source: original.outputs["index.html"],
        encoding: "utf8" as const,
        checksum: createHash("sha256")
          .update("utf8\0<h1>ok</h1>")
          .digest("hex"),
      },
      "assets/a.bin": {
        source: original.outputs["assets/a.bin"].source.toString("base64"),
        encoding: "base64" as const,
        checksum: createHash("sha256")
          .update(
            `base64\0${original.outputs["assets/a.bin"].source.toString("base64")}`,
          )
          .digest("hex"),
      },
    },
  };

  await saveOutputCache(cachePath, state);

  assert.deepEqual(await loadOutputCache(cachePath), state);
});

test("SSG output cache rejects entries with an invalid checksum", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");
  await fs.writeFile(
    cachePath,
    JSON.stringify({
      version: 2,
      outputs: {
        "index.html": {
          source: "corrupted",
          encoding: "utf8",
          checksum: "a".repeat(64),
        },
      },
    }),
    "utf8",
  );

  assert.equal(await loadOutputCache(cachePath), undefined);
});
