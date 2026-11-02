import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  analyzeWorkspace,
  collectWorkspacePackages,
} from "./check_dependencies.mjs";

function createWorkspace(packages) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-deps-"));
  for (const [directory, manifest, files] of packages) {
    const packageDirectory = path.join(root, directory);
    fs.mkdirSync(packageDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(packageDirectory, "package.json"),
      JSON.stringify(manifest, null, 2),
    );
    for (const [name, contents] of Object.entries(files ?? {})) {
      const file = path.join(packageDirectory, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
    }
  }
  return root;
}

function analyze(root) {
  return analyzeWorkspace({
    root,
    packages: collectWorkspacePackages(root),
  }).findings;
}

function packageAt(name, extra = {}) {
  return {
    name,
    version: "0.0.0",
    type: "module",
    exports: {
      ".": "./index.js",
      "./sub": "./sub.js",
    },
    ...extra,
  };
}

test("accepts declared imports of exported subpaths", () => {
  const root = createWorkspace([
    [
      "packages/core",
      packageAt("@riebeckite/core"),
      {
        "index.ts": "",
        "src/use.ts":
          'import { a } from "@riebeckite/core";\nimport { b } from "@riebeckite/core/sub";\n',
      },
    ],
  ]);
  const findings = analyze(root);
  assert.deepEqual(
    findings.filter((f) => f.kind === "undeclared-import"),
    [],
  );
  assert.deepEqual(
    findings.filter((f) => f.kind === "unexported-subpath"),
    [],
  );
});

test("fails on an undeclared import", () => {
  const root = createWorkspace([
    [
      "packages/core",
      packageAt("@riebeckite/core"),
      { "index.ts": 'import "hoisted-package";\n' },
    ],
  ]);
  const findings = analyze(root);
  assert.equal(findings[0].kind, "undeclared-import");
  assert.equal(findings[0].specifier, "hoisted-package");
});

test("fails on an unexported subpath", () => {
  const root = createWorkspace([
    ["packages/core", packageAt("@riebeckite/core"), { "index.ts": "" }],
    [
      "packages/node",
      packageAt("@riebeckite/node", {
        dependencies: { "@riebeckite/core": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/core/internal";\n' },
    ],
  ]);
  const findings = analyze(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, "unexported-subpath");
});

test("detects runtime workspace cycles but not type-only edges", () => {
  const root = createWorkspace([
    [
      "packages/core",
      packageAt("@riebeckite/core", {
        dependencies: { "@riebeckite/node": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/node";\n' },
    ],
    [
      "packages/node",
      packageAt("@riebeckite/node", {
        dependencies: { "@riebeckite/core": "workspace:*" },
      }),
      { "index.ts": 'import type { X } from "@riebeckite/core";\n' },
    ],
  ]);
  assert.deepEqual(
    analyze(root).filter((finding) => finding.kind === "workspace-cycle"),
    [],
  );

  const runtimeRoot = createWorkspace([
    [
      "packages/core",
      packageAt("@riebeckite/core", {
        dependencies: { "@riebeckite/node": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/node";\n' },
    ],
    [
      "packages/node",
      packageAt("@riebeckite/node", {
        dependencies: { "@riebeckite/core": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/core";\n' },
    ],
  ]);
  const cycles = analyze(runtimeRoot).filter(
    (finding) => finding.kind === "workspace-cycle",
  );
  assert.equal(cycles.length, 1);
  assert.match(cycles[0].message, /@riebeckite\/core/);
});

test("detects dynamic imports but ignores import-like template text", () => {
  const root = createWorkspace([
    ["packages/core", packageAt("@riebeckite/core"), { "index.ts": "" }],
    [
      "packages/node",
      packageAt("@riebeckite/node"),
      {
        "index.ts":
          'const text = `import "template-only"`;\nawait import("hoisted-package");\n',
      },
    ],
  ]);
  const specifiers = analyze(root)
    .filter((finding) => finding.kind === "undeclared-import")
    .map((finding) => finding.specifier);
  assert.deepEqual(specifiers, ["hoisted-package"]);
});

test("fails on forbidden reverse dependencies", () => {
  const root = createWorkspace([
    ["packages/cli", packageAt("@riebeckite/cli"), { "index.ts": "" }],
    [
      "packages/plugins/example",
      packageAt("@riebeckite/plugin-example", {
        dependencies: { "@riebeckite/cli": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/cli";\n' },
    ],
  ]);
  const findings = analyze(root);
  assert.equal(findings[0].kind, "forbidden-dependency");
  assert.match(findings[0].message, /Plugins must not depend/);
});

test("reports unused runtime dependencies and understands @types", () => {
  const root = createWorkspace([
    [
      "packages/core",
      packageAt("@riebeckite/core", {
        dependencies: { "@types/unist": "^4.0.0", "unused-package": "^1.0.0" },
      }),
      {
        "index.ts": 'import type { Node } from "unist";\n',
      },
    ],
    [
      "packages/node",
      packageAt("@riebeckite/node", {
        dependencies: { "@riebeckite/core": "workspace:*" },
      }),
      { "index.ts": 'import "@riebeckite/core";\n' },
    ],
  ]);
  const unused = analyze(root)
    .filter((finding) => finding.kind === "unused-dependency")
    .map((finding) => finding.specifier);
  assert.deepEqual(unused, ["unused-package"]);
});
