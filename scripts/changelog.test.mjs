import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildChangelogFiles,
  ChangeEntryError,
  checkChangelogFiles,
  collectChanges,
  DOCS_RELEASE_PATHS,
  finalizeRelease,
  parseChangeEntry,
  renderChangelog,
  renderReleaseNotes,
  UNRELEASED_DIRECTORY,
  validateEntry,
} from "./changelog.mjs";

const PACKAGE_NAMES = new Set(["@riebeckite/core", "@riebeckite/cli"]);

function entryText({
  packages = ["@riebeckite/core"],
  type = "added",
  breaking = false,
  migration = "",
  pr = "",
  issue = "",
  adr = "",
  body = "Add a user-facing change.",
} = {}) {
  const packageLines =
    packages.length === 0
      ? "packages: []"
      : `packages:\n${packages.map((name) => `  - "${name}"`).join("\n")}`;

  return `---
${packageLines}
type: ${type}
breaking: ${breaking}
migration: "${migration}"
pr: "${pr}"
issue: "${issue}"
adr: "${adr}"
---

${body}
`;
}

function withRoot(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-changes-"));
  fs.mkdirSync(path.join(root, UNRELEASED_DIRECTORY), { recursive: true });
  try {
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeEntry(root, filename, options) {
  fs.writeFileSync(
    path.join(root, UNRELEASED_DIRECTORY, filename),
    entryText(options),
    "utf8",
  );
}

function writeBytes(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("parseChangeEntry reads the frontmatter and body", () => {
  const entry = parseChangeEntry(
    entryText({ type: "fixed", packages: ["@riebeckite/cli"], body: "Fix X." }),
    `changes/unreleased/20261102-120000-fix-x-abcdef.md`,
  );

  assert.equal(entry.type, "fixed");
  assert.equal(entry.breaking, false);
  assert.deepEqual(entry.packages, ["@riebeckite/cli"]);
  assert.equal(entry.body, "Fix X.");
  assert.equal(entry.id, "20261102-120000-fix-x-abcdef");
});

test("validateEntry requires migration steps for a breaking change", () => {
  const entry = parseChangeEntry(
    entryText({ breaking: true }),
    "changes/unreleased/20261102-120000-break-x-abcdef.md",
  );

  const errors = validateEntry(entry, PACKAGE_NAMES);
  assert.ok(errors.some((error) => error.includes("requires migration steps")));
});

test("validateEntry rejects unknown packages and types", () => {
  const unknownPackage = parseChangeEntry(
    entryText({ packages: ["@riebeckite/missing"] }),
    "changes/unreleased/20261102-120000-unknown-abcdef.md",
  );
  assert.ok(
    validateEntry(unknownPackage, PACKAGE_NAMES).some((error) =>
      error.includes("unknown package"),
    ),
  );

  const unknownType = parseChangeEntry(
    entryText({ type: "feature" }),
    "changes/unreleased/20261102-120000-type-abcdef.md",
  );
  assert.ok(
    validateEntry(unknownType, PACKAGE_NAMES).some((error) =>
      error.includes("type must be one of"),
    ),
  );
});

test("collectChanges aggregates multiple entries and classifies breaking changes", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-first-abcdef.md", {
      type: "added",
      body: "Add first.",
    });
    writeEntry(root, "20261102-120100-second-abcdef.md", {
      type: "fixed",
      packages: ["@riebeckite/cli"],
      body: "Fix second.",
    });
    writeEntry(root, "20261102-120200-third-abcdef.md", {
      type: "changed",
      breaking: true,
      migration: "Rename the option.",
      body: "Rename third.",
    });

    const changes = collectChanges(root, { packageNames: PACKAGE_NAMES });
    assert.equal(changes.unreleased.length, 3);

    const markdown = renderChangelog(changes);
    assert.match(markdown, /### Added\n\n- Add first\./);
    assert.match(markdown, /### Fixed\n\n- Fix second\./);
    assert.match(markdown, /\*\*Breaking:\*\* Rename third\./);
    assert.match(markdown, /Migration: Rename the option\./);
    assert.match(markdown, /Breaking changes are included/);
  });
});

test("collectChanges rejects duplicate identifiers with different content", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-one-abcdef.md", { body: "First." });
    fs.mkdirSync(path.join(root, "changes/released/0.0.1/entries"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        root,
        "changes/released/0.0.1/entries/20261102-120000-one-abcdef.md",
      ),
      entryText({ body: "Different." }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(root, "changes/released/0.0.1/release.json"),
      `${JSON.stringify({ version: "0.0.1", date: "2026-11-01" })}\n`,
      "utf8",
    );

    assert.throws(
      () => collectChanges(root, { packageNames: PACKAGE_NAMES }),
      ChangeEntryError,
    );
  });
});

test("finalizeRelease archives entries and generates changelog and notes", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-one-abcdef.md", {
      type: "added",
      body: "Add one.",
    });
    writeEntry(root, "20261102-120100-two-abcdef.md", {
      type: "security",
      breaking: true,
      migration: "Upgrade and rotate the secret.",
      body: "Harden two.",
    });

    const result = finalizeRelease({
      root,
      version: "0.0.36",
      date: "2026-11-02",
      packageNames: PACKAGE_NAMES,
    });

    assert.equal(result.entryCount, 2);
    assert.equal(result.moved, 2);
    assert.equal(
      fs
        .readdirSync(path.join(root, UNRELEASED_DIRECTORY))
        .filter((name) => name.endsWith(".md")).length,
      0,
    );
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          "changes/released/0.0.36/entries/20261102-120000-one-abcdef.md",
        ),
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(root, "changes/released/0.0.36/release-notes.md"),
      ),
    );

    const changelog = writeBytes(root, "CHANGELOG.md");
    assert.match(changelog, /## \[0\.0\.36\] - 2026-11-02/);
    assert.equal((changelog.match(/\[0\.0\.36\]:/g) ?? []).length, 1);

    const notes = writeBytes(root, "changes/released/0.0.36/release-notes.md");
    assert.match(notes, /# Riebeckite v0\.0\.36/);
    assert.match(notes, /\*\*Breaking:\*\* Harden two\./);
    assert.match(notes, /Migration: Upgrade and rotate the secret\./);

    assert.match(
      writeBytes(root, DOCS_RELEASE_PATHS.en),
      /## 0\.0\.36 - 2026-11-02/,
    );
    assert.match(
      writeBytes(root, DOCS_RELEASE_PATHS.ja),
      /## 0\.0\.36 - 2026-11-02/,
    );
  });
});

test("finalizeRelease is idempotent and preserves the original release date", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-one-abcdef.md", { body: "Add one." });

    finalizeRelease({
      root,
      version: "0.0.36",
      date: "2026-11-02",
      packageNames: PACKAGE_NAMES,
    });
    const firstChangelog = writeBytes(root, "CHANGELOG.md");
    const firstNotes = writeBytes(
      root,
      "changes/released/0.0.36/release-notes.md",
    );

    finalizeRelease({
      root,
      version: "0.0.36",
      date: "2026-12-01",
      packageNames: PACKAGE_NAMES,
    });

    assert.equal(writeBytes(root, "CHANGELOG.md"), firstChangelog);
    assert.equal(
      writeBytes(root, "changes/released/0.0.36/release-notes.md"),
      firstNotes,
    );
    assert.equal(
      (writeBytes(root, "CHANGELOG.md").match(/## \[0\.0\.36\]/g) ?? []).length,
      1,
    );
  });
});

test("finalizeRelease recovers when an entry was copied but not removed", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-one-abcdef.md", { body: "Add one." });

    const targetDirectory = path.join(root, "changes/released/0.0.36/entries");
    fs.mkdirSync(targetDirectory, { recursive: true });
    fs.copyFileSync(
      path.join(root, UNRELEASED_DIRECTORY, "20261102-120000-one-abcdef.md"),
      path.join(targetDirectory, "20261102-120000-one-abcdef.md"),
    );

    const result = finalizeRelease({
      root,
      version: "0.0.36",
      date: "2026-11-02",
      packageNames: PACKAGE_NAMES,
    });

    assert.equal(result.moved, 1);
    assert.equal(result.entryCount, 1);
    assert.equal(
      fs
        .readdirSync(path.join(root, UNRELEASED_DIRECTORY))
        .filter((name) => name.endsWith(".md")).length,
      0,
    );
  });
});

test("checkChangelogFiles detects generated files that were edited by hand", () => {
  withRoot((root) => {
    writeEntry(root, "20261102-120000-one-abcdef.md", { body: "Add one." });
    buildChangelogFiles(root, { packageNames: PACKAGE_NAMES });
    assert.deepEqual(
      checkChangelogFiles(root, { packageNames: PACKAGE_NAMES }).errors,
      [],
    );

    fs.appendFileSync(path.join(root, "CHANGELOG.md"), "\nmanual edit\n");

    const errors = checkChangelogFiles(root, {
      packageNames: PACKAGE_NAMES,
    }).errors;
    assert.ok(errors.some((error) => error.includes("CHANGELOG.md")));
  });
});
