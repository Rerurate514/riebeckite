import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { analyze } from "./check_source_health.mjs";

function createTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-health-"));
  const paths = [];
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    paths.push(file);
  }
  return { root, files: paths };
}

function messages(result, kind) {
  return (kind === "error" ? result.errors : result.warnings).filter((line) =>
    line.startsWith(`[${kind}]`),
  );
}

test("rejects Core dependencies on outer layers", () => {
  const tree = createTree({
    "packages/core/src/index.ts": 'import "@riebeckite/plugin-example";\n',
  });
  const result = analyze(tree.files, tree.root);
  assert.ok(
    result.errors.some((line) =>
      line.includes('Core must not depend on "@riebeckite/plugin-example"'),
    ),
  );
});

test("rejects Theme dependencies on Plugins", () => {
  const tree = createTree({
    "packages/themes/example/src/style.ts":
      'import "@riebeckite/plugin-example";\n',
  });
  const result = analyze(tree.files, tree.root);
  assert.ok(
    result.errors.some((line) => line.includes("Theme must not depend")),
  );
});

test("rejects Node builtins in browser entry points", () => {
  const tree = createTree({
    "packages/core/src/client/render.ts": 'import fs from "node:fs";\n',
  });
  const result = analyze(tree.files, tree.root);
  assert.ok(result.errors.some((line) => line.includes("Browser/Worker code")));
});

test("errors on runtime local cycles but not type-only cycles", () => {
  const runtime = createTree({
    "packages/core/src/a.ts": 'import "./b.js";\n',
    "packages/core/src/b.ts": 'import "./a.js";\n',
  });
  const runtimeResult = analyze(runtime.files, runtime.root);
  assert.ok(
    runtimeResult.errors.some((line) =>
      line.includes("runtime circular import"),
    ),
  );

  const typeOnly = createTree({
    "packages/core/src/a.ts": 'import type { B } from "./b.js";\n',
    "packages/core/src/b.ts": 'import type { A } from "./a.js";\n',
  });
  const typeResult = analyze(typeOnly.files, typeOnly.root);
  assert.deepEqual(
    typeResult.errors.filter((line) =>
      line.includes("runtime circular import"),
    ),
    [],
  );
});

test("reports directory cycles as advisory warnings", () => {
  const tree = createTree({
    "packages/core/src/a/one.ts": 'import "../b/two.js";\n',
    "packages/core/src/a/four.ts": "",
    "packages/core/src/b/two.ts": "",
    "packages/core/src/b/three.ts": 'import "../a/four.js";\n',
  });
  const result = analyze(tree.files, tree.root);
  assert.ok(
    result.warnings.some((line) => line.includes("directory dependency cycle")),
  );
  assert.deepEqual(messages(result, "error"), []);
});
