import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createFrameworkResolutionPlugin,
  loadStandaloneSsgBundle,
} from "../src/ssg/standalone.js";

const frameworkRequire = createRequire(
  new URL("../src/ssg/standalone.ts", import.meta.url),
);

test("standalone SSG loads dynamic chunks from the same bundle instance", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-standalone-bundle-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(root, "marker.ts"),
    "export const marker = { value: 1 };\n",
  );
  await fs.writeFile(
    path.join(root, "chunk.ts"),
    'import { marker } from "./entry.js";\nexport function isSame(value: unknown) {\n  return marker === value;\n}\n',
  );
  await fs.writeFile(
    path.join(root, "entry.ts"),
    'import { marker } from "./marker.js";\nexport { marker };\nexport async function check() {\n  const { isSame } = await import("./chunk.js");\n  return isSame(marker);\n}\nexport default { check };\n',
  );

  const bundle = await loadStandaloneSsgBundle({
    root,
    entry: path.join(root, "entry.ts"),
    outputDirectory: path.join(root, "out"),
  });

  assert.equal(
    await (
      bundle.module.default as unknown as { check: () => Promise<boolean> }
    ).check(),
    true,
  );
});

test("standalone SSG resolves Hono and HonoX from the integration package", () => {
  const hook = createFrameworkResolutionPlugin().resolveId;
  assert.equal(typeof hook, "function");
  const resolveId = hook as (source: string) => string | undefined;
  assert.equal(resolveId("hono"), frameworkRequire.resolve("hono"));
  assert.equal(resolveId("hono/jsx"), frameworkRequire.resolve("hono/jsx"));
  assert.equal(
    resolveId("honox/server"),
    frameworkRequire.resolve("honox/server"),
  );
  assert.equal(resolveId("@riebeckite/ui"), undefined);
});
