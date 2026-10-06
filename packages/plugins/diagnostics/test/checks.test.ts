import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { definePlugin, resolveConfig } from "@riebeckite/core";
import { analyzeContent, runDiagnostics } from "../index.js";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-diag-"));
}

test("missing-frontmatter is only reported when fields are required", async () => {
  const root = tempRoot();
  try {
    fs.writeFileSync(path.join(root, "note.md"), "# Note\n");

    const withoutRequirement = await runDiagnostics(root, {});
    assert.equal(
      withoutRequirement.diagnostics.some(
        (diagnostic) => diagnostic.code === "missing-frontmatter",
      ),
      false,
    );

    const withRequirement = await runDiagnostics(root, {
      requiredFrontmatter: ["title"],
    });
    const reported = withRequirement.diagnostics.filter(
      (diagnostic) => diagnostic.code === "missing-frontmatter",
    );
    assert.equal(reported.length, 1);
    assert.equal(reported[0]?.message, "note has no frontmatter");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate titles are scoped per configured language", async () => {
  const root = tempRoot();
  try {
    fs.writeFileSync(
      path.join(root, "index.md"),
      "---\ntitle: Home\npublish: true\n---\n# Home\n",
    );
    fs.writeFileSync(
      path.join(root, "index.en.md"),
      "---\ntitle: Home\npublish: true\n---\n# Home\n",
    );

    const config = resolveConfig({
      site: { title: "Test" },
      content: {
        directory: root,
        filters: { publishStrategy: "selective" },
      },
      plugins: [
        definePlugin({
          name: "l10n",
          options: { defaultLang: "ja", languages: ["ja", "en"] },
        }),
      ],
    });

    const scoped = await runDiagnostics(config, {});
    assert.equal(
      scoped.diagnostics.some(
        (diagnostic) => diagnostic.code === "duplicate-title",
      ),
      false,
    );

    const unscoped = await runDiagnostics(root, {});
    assert.equal(
      unscoped.diagnostics.filter(
        (diagnostic) => diagnostic.code === "duplicate-title",
      ).length,
      2,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate titles in the same language still collide", async () => {
  const root = tempRoot();
  try {
    fs.writeFileSync(
      path.join(root, "a.en.md"),
      "---\ntitle: Same\npublish: true\n---\n# Same\n",
    );
    fs.writeFileSync(
      path.join(root, "b.en.md"),
      "---\ntitle: Same\npublish: true\n---\n# Same\n",
    );

    const config = resolveConfig({
      site: { title: "Test" },
      content: {
        directory: root,
        filters: { publishStrategy: "selective" },
      },
      plugins: [
        definePlugin({
          name: "l10n",
          options: { defaultLang: "en", languages: ["en"] },
        }),
      ],
    });

    const report = await runDiagnostics(config, {});
    const collisions = report.diagnostics.filter(
      (diagnostic) => diagnostic.code === "duplicate-title",
    );
    assert.equal(collisions.length, 2);
    assert.deepEqual(collisions.map((diagnostic) => diagnostic.slug).sort(), [
      "a.en",
      "b.en",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("orphan and unused-asset checks require reference integrity", async () => {
  const root = tempRoot();
  try {
    fs.writeFileSync(
      path.join(root, "note.md"),
      "---\ntitle: Note\npublish: true\n---\n# Note\n",
    );
    fs.writeFileSync(path.join(root, "orphan.png"), "image");

    const withIntegrity = await analyzeContent(
      { directory: root, exclude: [], publishStrategy: "selective" },
      { reportOrphans: true, reportUnusedAssets: true },
    );
    assert.equal(
      withIntegrity.some((diagnostic) => diagnostic.code === "orphan-note"),
      true,
    );
    assert.equal(
      withIntegrity.some((diagnostic) => diagnostic.code === "unused-asset"),
      true,
    );

    const withoutIntegrity = await analyzeContent(
      { directory: root, exclude: [], publishStrategy: "selective" },
      {
        reportOrphans: true,
        reportUnusedAssets: true,
        skipReferenceIntegrity: true,
      },
    );
    assert.equal(
      withoutIntegrity.some((diagnostic) => diagnostic.code === "orphan-note"),
      false,
    );
    assert.equal(
      withoutIntegrity.some((diagnostic) => diagnostic.code === "unused-asset"),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
