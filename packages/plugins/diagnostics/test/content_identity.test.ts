import assert from "node:assert/strict";
import { test } from "node:test";
import type { Diagnostic } from "@riebeckite/core";
import { checkContentIdIntegrity } from "../src/checks/content_identity.js";
import { normalizeOptions } from "../src/checks/shared.js";
import type { ScannedNote, ScanResult } from "../src/vault.js";

function note(
  slug: string,
  frontmatter: Record<string, unknown>,
  published = true,
): ScannedNote {
  return {
    relativePath: `${slug}.md`,
    slug,
    markdown: "",
    fm: { hasFrontmatter: true, values: frontmatter },
    headings: new Set(),
    blockIds: new Set(),
    excluded: false,
    published,
  };
}

function scan(...notes: ScannedNote[]): ScanResult {
  return {
    includedNotes: notes,
    excludedNotes: [],
    noteSlugs: new Set(notes.map((item) => item.slug)),
    noteBySlug: new Map(notes.map((item) => [item.slug, item])),
    assetPaths: new Set(),
    assets: [],
    filePaths: new Set(),
    targetIndex: new Map(),
  };
}

function collect(...notes: ScannedNote[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  checkContentIdIntegrity(scan(...notes), normalizeOptions({}), diagnostics);
  return diagnostics;
}

test("duplicate content IDs across published notes are reported as errors", () => {
  const diagnostics = collect(
    note("a", { id: "shared" }),
    note("b", { id: "shared" }),
  );
  assert.equal(diagnostics.length, 2);
  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.code, "duplicate-content-id");
    assert.equal(diagnostic.severity, "error");
    assert.match(diagnostic.message, /"shared"/);
  }
});

test("unique content IDs produce no diagnostics", () => {
  const diagnostics = collect(
    note("a", { id: "one" }),
    note("b", { id: "two" }),
    note("c", { uid: "legacy-id" }),
  );
  assert.deepEqual(diagnostics, []);
});

test("notes without a content ID are not reported", () => {
  const diagnostics = collect(note("a", {}), note("b", { title: "No id" }));
  assert.deepEqual(diagnostics, []);
});

test("conflicting id and uid frontmatter is reported as an invalid content id", () => {
  const diagnostics = collect(note("a", { id: "one", uid: "two" }));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "invalid-content-id");
  assert.equal(diagnostics[0]?.severity, "error");
  assert.equal(diagnostics[0]?.slug, "a");
});

test("whitespace-padded content IDs are reported as invalid", () => {
  const diagnostics = collect(note("a", { id: " padded " }));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "invalid-content-id");
});

test("duplicate IDs are ignored when a note is not published", () => {
  const diagnostics = collect(
    note("a", { id: "shared" }),
    note("b", { id: "shared" }, false),
  );
  assert.deepEqual(diagnostics, []);
});

test("invalid ID on a non-published note is ignored", () => {
  const diagnostics = collect(note("a", { id: "one", uid: "two" }, false));
  assert.deepEqual(diagnostics, []);
});
