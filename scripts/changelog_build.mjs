import fs from "node:fs";
import path from "node:path";
import { collectChanges } from "./changelog_collect.mjs";
import { readOptional, renderDocsPages, writeFile } from "./changelog_docs.mjs";
import { renderChangelog, renderReleaseNotes } from "./changelog_render.mjs";
import {
  CHANGELOG_PATH,
  ChangeEntryError,
  RELEASED_DIRECTORY,
  REPOSITORY_URL,
  repositoryRoot,
} from "./changelog_schema.mjs";

export function buildChangelogFiles(root = repositoryRoot, options = {}) {
  const changes = collectChanges(root, options);
  const changelog = renderChangelog(changes);
  const docsPages = renderDocsPages(changes);

  writeFile(root, CHANGELOG_PATH, changelog);

  for (const [relativePath, content] of Object.entries(docsPages)) {
    writeFile(root, relativePath, content);
  }

  return {
    ...changes,
    changelog,
    docsPages,
  };
}

export function checkChangelogFiles(root = repositoryRoot, options = {}) {
  const changes = collectChanges(root, options);
  const expected = {
    [CHANGELOG_PATH]: renderChangelog(changes),
    ...renderDocsPages(changes),
  };
  const errors = [];

  for (const [relativePath, content] of Object.entries(expected)) {
    const actual = readOptional(root, relativePath);
    if (actual === null) {
      errors.push(`${relativePath}: missing generated file`);
    } else if (actual !== content) {
      errors.push(`${relativePath}: out of date; run pnpm changelog`);
    }
  }

  return { ...changes, errors };
}

export function finalizeRelease({
  root = repositoryRoot,
  version,
  date,
  packageNames,
} = {}) {
  if (
    typeof version !== "string" ||
    !/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(version)
  ) {
    throw new ChangeEntryError(`Invalid release version: ${version}`);
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ChangeEntryError(`Invalid release date: ${date}`);
  }

  const targetDirectory = path.join(root, RELEASED_DIRECTORY, version);
  const targetEntriesDirectory = path.join(targetDirectory, "entries");
  const metadataPath = path.join(targetDirectory, "release.json");

  if (fs.existsSync(targetDirectory) && !fs.existsSync(metadataPath)) {
    writeFile(
      root,
      path.join(RELEASED_DIRECTORY, version, "release.json"),
      `${JSON.stringify({ version, date }, null, 2)}\n`,
    );
  }

  const changes = collectChanges(root, { packageNames });
  const existingMetadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
    : null;
  const effectiveDate = existingMetadata?.date ?? date;

  fs.mkdirSync(targetEntriesDirectory, { recursive: true });

  let moved = 0;

  for (const entry of changes.unreleased) {
    const sourcePath = path.join(root, entry.file);
    const targetPath = path.join(targetEntriesDirectory, entry.filename);
    const content = fs.readFileSync(sourcePath, "utf8");

    if (fs.existsSync(targetPath)) {
      if (fs.readFileSync(targetPath, "utf8") !== content) {
        throw new ChangeEntryError(
          `${entry.file}: a different ${path.join(RELEASED_DIRECTORY, version, "entries", entry.filename)} already exists`,
        );
      }
    } else {
      fs.writeFileSync(targetPath, content, "utf8");
    }

    fs.rmSync(sourcePath);
    moved += 1;
  }

  writeFile(
    root,
    path.join(RELEASED_DIRECTORY, version, "release.json"),
    `${JSON.stringify({ version, date: effectiveDate }, null, 2)}\n`,
  );

  const updated = collectChanges(root, { packageNames });
  const release = updated.releases.find(
    (candidate) => candidate.version === version,
  );

  if (!release) {
    throw new ChangeEntryError(`Release ${version} could not be recorded`);
  }

  const releaseNotes = renderReleaseNotes({
    version,
    date: effectiveDate,
    entries: release.entries,
    changelogUrl: `${REPOSITORY_URL}/blob/v${version}/CHANGELOG.md`,
  });

  writeFile(
    root,
    path.join(RELEASED_DIRECTORY, version, "release-notes.md"),
    releaseNotes,
  );

  buildChangelogFiles(root, { packageNames });

  return {
    version,
    date: effectiveDate,
    moved,
    entryCount: release.entries.length,
    releaseNotes,
  };
}
