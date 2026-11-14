import fs from "node:fs";
import path from "node:path";
import { parseChangeEntry, validateEntry } from "./changelog_parse.mjs";
import {
  ChangeEntryError,
  RELEASED_DIRECTORY,
  UNRELEASED_DIRECTORY,
} from "./changelog_schema.mjs";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

export function readPublicPackageNames(root) {
  const names = new Set();

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, directory, "package.json"), "utf8"),
    );
    names.add(manifest.name);
  }

  return names;
}

export function readEntriesFromDirectory(directory, relativeDirectory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort()
    .map((filename) => {
      const file = path.join(relativeDirectory, filename);
      const text = fs.readFileSync(path.join(directory, filename), "utf8");
      return parseChangeEntry(text, file);
    });
}

export function readReleaseMetadata(directory, version) {
  const metadataPath = path.join(directory, "release.json");
  if (!fs.existsSync(metadataPath)) {
    throw new ChangeEntryError(
      `${path.join(RELEASED_DIRECTORY, version)}: missing release.json`,
    );
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  if (metadata.version !== version) {
    throw new ChangeEntryError(
      `${path.join(RELEASED_DIRECTORY, version, "release.json")}: expected version ${version}, found ${metadata.version}`,
    );
  }
  if (typeof metadata.date !== "string" || metadata.date === "") {
    throw new ChangeEntryError(
      `${path.join(RELEASED_DIRECTORY, version, "release.json")}: missing date`,
    );
  }

  return { version, date: metadata.date };
}

export function collectChanges(root, options = {}) {
  const packageNames = options.packageNames ?? readPublicPackageNames(root);
  const unreleased = readEntriesFromDirectory(
    path.join(root, UNRELEASED_DIRECTORY),
    UNRELEASED_DIRECTORY,
  );

  const releasedRoot = path.join(root, RELEASED_DIRECTORY);
  const releases = [];

  if (fs.existsSync(releasedRoot)) {
    for (const entry of fs.readdirSync(releasedRoot, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const version = entry.name;
      const directory = path.join(releasedRoot, version);
      const metadata = readReleaseMetadata(directory, version);
      const entries = readEntriesFromDirectory(
        path.join(directory, "entries"),
        path.join(RELEASED_DIRECTORY, version, "entries"),
      );

      releases.push({ ...metadata, entries });
    }
  }

  releases.sort((left, right) =>
    right.version.localeCompare(left.version, undefined, { numeric: true }),
  );

  const errors = [];

  for (const entry of unreleased) {
    errors.push(...validateEntry(entry, packageNames));
  }

  for (const release of releases) {
    for (const entry of release.entries) {
      errors.push(...validateEntry(entry, packageNames));
    }
  }

  const seen = new Map();

  for (const entry of [
    ...releases.flatMap((release) => release.entries),
    ...unreleased,
  ]) {
    const previous = seen.get(entry.id);

    if (!previous) {
      seen.set(entry.id, entry);
      continue;
    }

    const versionOf = (candidate) =>
      /^changes\/released\/([^/]+)\//.exec(candidate.file)?.[1] ?? null;
    const previousVersion = versionOf(previous);
    const entryVersion = versionOf(entry);

    if (
      previous.body !== entry.body ||
      (previousVersion !== null &&
        entryVersion !== null &&
        previousVersion !== entryVersion)
    ) {
      errors.push(`${entry.file}: duplicates ${previous.file}`);
    }
  }

  if (errors.length > 0) {
    throw new ChangeEntryError(
      `Change entry validation failed:\n${errors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  return { packageNames, unreleased, releases };
}
