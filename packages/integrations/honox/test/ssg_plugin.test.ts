import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createNoChangeFastPathOutputMetrics,
  findBuildOutputSiteCollisions,
  loadOutputCache,
  saveOutputCache,
  shouldApplyRiebeckiteSsg,
  verifyNoChangeFastPath,
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
    JSON.stringify({ version: 3 }),
    JSON.stringify({ version: 3, outputs: null }),
    JSON.stringify({ version: 3, outputs: { "index.html": null } }),
    JSON.stringify({
      version: 3,
      outputs: { "index.html": { source: 1, encoding: "utf8" } },
    }),
    JSON.stringify({
      version: 3,
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
    version: 3 as const,
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
      version: 3,
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

test("no-change fast path verifies inputs and every final output", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-fast-path-"),
  );
  const app = path.join(root, "app");
  const output = path.join(root, "dist");
  const cache = path.join(root, ".riebeckite", "ssg-output-cache.json");
  const config = path.join(root, "vite.config.ts");
  await fs.mkdir(app, { recursive: true });
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(config, "export default {};\n");
  await fs.writeFile(path.join(app, "index.tsx"), "export {};\n");
  await fs.writeFile(path.join(output, "index.html"), "<main>ok</main>");

  const outputSource = "<main>ok</main>";
  const outputChecksum = createHash("sha256")
    .update(outputSource)
    .digest("hex");
  const appFingerprint = createHash("sha256")
    .update("app/index.tsx\0")
    .update("export {};\n")
    .update("\0")
    .update("vite.config.ts\0")
    .update("export default {};\n")
    .update("\0")
    .digest("hex");
  await saveOutputCache(cache, {
    version: 3,
    appFingerprint,
    configFile: config,
    outputs: {
      "index.html": {
        source: outputSource,
        encoding: "utf8",
        checksum: createHash("sha256")
          .update(`utf8\0${outputSource}`)
          .digest("hex"),
      },
    },
    finalOutputInventory: { "index.html": outputChecksum },
  });

  assert.deepEqual(
    await verifyNoChangeFastPath({
      root,
      outputDirectory: output,
      expectedOutputPaths: ["index.html"],
    }),
    { used: true },
  );
  await fs.writeFile(path.join(output, "index.html"), "corrupted");
  assert.deepEqual(
    await verifyNoChangeFastPath({
      root,
      outputDirectory: output,
      expectedOutputPaths: ["index.html"],
    }),
    { used: false, blockReason: "output-inventory-mismatch" },
  );
  await fs.writeFile(cache, "corrupted", "utf8");
  assert.deepEqual(
    await verifyNoChangeFastPath({
      root,
      outputDirectory: output,
      expectedOutputPaths: ["index.html"],
    }),
    { used: false, blockReason: "output-cache-missing-or-invalid" },
  );
});

test("no-change fast path metrics count hashed output files and bytes", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-fast-path-metrics-"),
  );
  const app = path.join(root, "app");
  const output = path.join(root, "dist");
  const cache = path.join(root, ".riebeckite", "ssg-output-cache.json");
  const config = path.join(root, "vite.config.ts");
  await fs.mkdir(path.join(output, "assets"), { recursive: true });
  await fs.mkdir(app, { recursive: true });
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(config, "export default {};\n");
  await fs.writeFile(path.join(app, "index.tsx"), "export {};\n");

  const html = "<main>ok</main>";
  const binary = Buffer.from([1, 2, 3, 4]);
  await fs.writeFile(path.join(output, "index.html"), html);
  await fs.writeFile(path.join(output, "assets", "a.bin"), binary);

  const appFingerprint = createHash("sha256")
    .update("app/index.tsx\0")
    .update("export {};\n")
    .update("\0")
    .update("vite.config.ts\0")
    .update("export default {};\n")
    .update("\0")
    .digest("hex");
  const checksum = (source: string) =>
    createHash("sha256").update(`utf8\0${source}`).digest("hex");
  await saveOutputCache(cache, {
    version: 3,
    appFingerprint,
    configFile: config,
    outputs: {
      "index.html": {
        source: html,
        encoding: "utf8",
        checksum: checksum(html),
      },
      "assets/a.bin": {
        source: binary.toString("base64"),
        encoding: "base64",
        checksum: createHash("sha256")
          .update(`base64\0${binary.toString("base64")}`)
          .digest("hex"),
      },
    },
    finalOutputInventory: {
      "index.html": createHash("sha256").update(html).digest("hex"),
      "assets/a.bin": createHash("sha256").update(binary).digest("hex"),
    },
  });

  const metrics = createNoChangeFastPathOutputMetrics();
  const result = await verifyNoChangeFastPath({
    root,
    outputDirectory: output,
    expectedOutputPaths: ["index.html", "assets/a.bin"],
    metrics,
  });

  assert.deepEqual(result, { used: true });
  assert.equal(metrics.outputFilesHashed, 2);
  assert.equal(metrics.outputBytesHashed, html.length + binary.length);
  assert.ok(metrics.outputInventoryValidationDurationMs >= 0);
  assert.ok(metrics.outputHashValidationDurationMs >= 0);
});
