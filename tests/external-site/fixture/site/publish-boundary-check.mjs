import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runDiagnostics } from "@riebeckite/plugin-diagnostics";

const PUBLISH_BOUNDARY = "publish-boundary";

function createVault(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-publish-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return root;
}

function boundaryDiagnostics(report) {
  return report.diagnostics.filter(
    (diagnostic) => diagnostic.code === PUBLISH_BOUNDARY,
  );
}

// A published note that links to a non-published note is a boundary leak.
const leakVault = createVault({
  "notes/public.md": "---\npublish: true\n---\n\nSee [[notes/private]].\n",
  "notes/private.md": "---\npublish: false\n---\n\nsecret\n",
});
try {
  const report = await runDiagnostics(leakVault, {
    publishStrategy: "explicit",
  });
  const leaks = boundaryDiagnostics(report);
  assert.equal(leaks.length, 1, "expected exactly one publish-boundary leak");
  assert.match(leaks[0].message, /private/);
  assert.equal(leaks[0].severity, "warning");
} finally {
  fs.rmSync(leakVault, { recursive: true, force: true });
}

// Markdown links across the boundary are detected the same way.
const markdownLeakVault = createVault({
  "notes/public.md": "---\npublish: true\n---\n\nSee [private](private.md).\n",
  "notes/private.md": "---\npublish: false\n---\n\nsecret\n",
});
try {
  const report = await runDiagnostics(markdownLeakVault, {
    publishStrategy: "explicit",
  });
  assert.equal(boundaryDiagnostics(report).length, 1);
} finally {
  fs.rmSync(markdownLeakVault, { recursive: true, force: true });
}

// The fixture vault itself must be leak-free.
const fixtureVault = path.resolve(process.cwd(), "..", "vault");
const fixtureReport = await runDiagnostics(fixtureVault, {
  publishStrategy: "explicit",
});
assert.equal(
  boundaryDiagnostics(fixtureReport).length,
  0,
  "the fixture vault must not cross the publish boundary",
);

console.log("publish-boundary-check OK");
