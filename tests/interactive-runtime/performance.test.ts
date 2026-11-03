import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const staticRoot = path.join(repositoryRoot, "website/dist/static");
const pagePath = path.join(
  repositoryRoot,
  "website/dist/docs/plugins/calculator.html",
);

test("the official runtime keeps its bundle split", async () => {
  const html = await fs.readFile(pagePath, "utf8");
  const mainMatch = /\/static\/(client-[^"]+\.js)/.exec(html);
  assert.ok(mainMatch?.[1], "The calculator page must load a client entry.");

  const files = await fs.readdir(staticRoot);
  const runtimeChunk = files.find((file) =>
    /^client-runtime-.*\.js$/.test(file),
  );
  assert.ok(runtimeChunk, "The lazy runtime chunk must exist.");

  const main = await fs.readFile(path.join(staticRoot, mainMatch[1]));
  const runtime = await fs.readFile(path.join(staticRoot, runtimeChunk));
  const measurement = {
    mainClientBytes: main.byteLength,
    mainClientGzipBytes: gzipSync(main).byteLength,
    runtimeChunkBytes: runtime.byteLength,
    runtimeChunkGzipBytes: gzipSync(runtime).byteLength,
  };
  console.log(`[runtime-bundle] ${JSON.stringify(measurement)}`);

  assert.ok(measurement.runtimeChunkBytes < 100 * 1024);
  assert.ok(measurement.runtimeChunkGzipBytes < 50 * 1024);
  assert.ok(measurement.mainClientBytes < 500 * 1024);
  assert.ok(measurement.mainClientGzipBytes < 150 * 1024);
});
