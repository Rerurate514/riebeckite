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
    JSON.stringify({ version: 4, outputs: { "index.html": null } }),
    JSON.stringify({
      version: 4,
      outputs: { "index.html": { cachePath: "0", checksum: "a".repeat(64) } },
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
  const output = path.join(directory, "dist");
  const html = "<h1>ok</h1>";
  const binary = Buffer.from([1, 2, 3]);
  await fs.mkdir(path.join(output, "assets"), { recursive: true });
  await fs.writeFile(path.join(output, "index.html"), html);
  await fs.writeFile(path.join(output, "assets", "a.bin"), binary);

  const state = {
    version: 4 as const,
    outputs: {
      "index.html": {
        cachePath: "",
        checksum: "",
      },
      "assets/a.bin": {
        cachePath: "",
        checksum: "",
      },
    },
  };

  await saveOutputCache(cachePath, state, output);

  const loaded = await loadOutputCache(cachePath);
  assert.deepEqual(loaded?.outputs, {
    "index.html": {
      cachePath: createHash("sha256").update("index.html").digest("hex"),
      checksum: createHash("sha256").update(html).digest("hex"),
    },
    "assets/a.bin": {
      cachePath: createHash("sha256").update("assets/a.bin").digest("hex"),
      checksum: createHash("sha256").update(binary).digest("hex"),
    },
  });
});

test("SSG output cache rejects entries with an invalid checksum", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");
  await fs.writeFile(
    cachePath,
    JSON.stringify({
      version: 4,
      outputs: {
        "index.html": {
          cachePath: "0",
          checksum: "a".repeat(64),
        },
      },
    }),
    "utf8",
  );

  assert.equal(await loadOutputCache(cachePath), undefined);
});

test("SSG output cache falls back when a cached entry is corrupted", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ssg-cache-"),
  );
  const cachePath = path.join(directory, "ssg-output-cache.json");
  const output = path.join(directory, "dist");
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "index.html"), "<h1>ok</h1>");
  await saveOutputCache(
    cachePath,
    {
      version: 4,
      outputs: {
        "index.html": { cachePath: "", checksum: "" },
      },
    },
    output,
  );

  const cached = await loadOutputCache(cachePath);
  assert.ok(cached);
  await fs.writeFile(
    path.join(
      directory,
      "ssg-output-cache.entries",
      cached.outputs["index.html"].cachePath,
    ),
    "corrupted",
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
  await saveOutputCache(
    cache,
    {
      version: 4,
      appFingerprint,
      configFile: config,
      outputs: {
        "index.html": {
          cachePath: "",
          checksum: "",
        },
      },
      finalOutputInventory: { "index.html": outputChecksum },
    },
    output,
  );

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
  await saveOutputCache(
    cache,
    {
      version: 4,
      appFingerprint,
      configFile: config,
      outputs: {
        "index.html": {
          cachePath: "",
          checksum: "",
        },
        "assets/a.bin": {
          cachePath: "",
          checksum: "",
        },
      },
      finalOutputInventory: {
        "index.html": createHash("sha256").update(html).digest("hex"),
        "assets/a.bin": createHash("sha256").update(binary).digest("hex"),
      },
    },
    output,
  );

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
