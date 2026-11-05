import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hasRequiredBuildOutput } from "./build_packages.mjs";

test("requires every declared dist target", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-build-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "dist"));
  fs.writeFileSync(path.join(directory, "dist", "index.js"), "");

  const manifest = {
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports: {
      "./client": {
        import: "./dist/client.js",
        types: "./dist/client.d.ts",
      },
    },
  };

  assert.equal(hasRequiredBuildOutput(directory, manifest), false);
  fs.mkdirSync(path.join(directory, "dist", "index.d.ts"));
  assert.equal(hasRequiredBuildOutput(directory, manifest), false);
  fs.rmdirSync(path.join(directory, "dist", "index.d.ts"));
  fs.writeFileSync(path.join(directory, "dist", "index.d.ts"), "");
  fs.writeFileSync(path.join(directory, "dist", "client.js"), "");
  fs.writeFileSync(path.join(directory, "dist", "client.d.ts"), "");
  assert.equal(hasRequiredBuildOutput(directory, manifest), true);
});

test("requires a file when the manifest has no dist targets", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-build-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "dist"));

  assert.equal(hasRequiredBuildOutput(directory, {}), false);
  fs.writeFileSync(path.join(directory, "dist", "output.js"), "");
  assert.equal(hasRequiredBuildOutput(directory, {}), true);
});
