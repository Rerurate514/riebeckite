#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PACKAGE_DIRECTORIES, repositoryUrl } from "./package_metadata.mjs";

export const CHANGE_TYPES = [
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
];

const TYPE_HEADINGS = {
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
};

const CHANGE_KEYS = new Set([
  "packages",
  "type",
  "breaking",
  "migration",
  "pr",
  "issue",
  "adr",
]);

export const UNRELEASED_DIRECTORY = "changes/unreleased";
export const RELEASED_DIRECTORY = "changes/released";
export const CHANGELOG_PATH = "CHANGELOG.md";
export const DOCS_RELEASE_PATHS = {
  en: "docs/docs/releases.md",
  ja: "docs/docs/releases.ja.md",
};

export const ENTRY_NAME_PATTERN =
  /^\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{6}\.md$/;

export const REPOSITORY_URL = repositoryUrl.replace(/\.git$/, "");

const repositoryRoot = path.resolve(import.meta.dirname, "..");

export class ChangeEntryError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "ChangeEntryError";
    this.status = status;
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(
    text.replace(/^\uFEFF/, ""),
  );

  if (!match) {
    throw new ChangeEntryError(`${file}: missing frontmatter`);
  }

  const data = {};
  let currentList = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "") {
      continue;
    }

    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (currentList === null) {
        throw new ChangeEntryError(
          `${file}: list item without a list field: ${line.trim()}`,
        );
      }
      data[currentList].push(unquote(item[1]));
      continue;
    }

    const pair = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!pair) {
      throw new ChangeEntryError(`${file}: invalid frontmatter line: ${line}`);
    }

    const [, key, raw] = pair;
    if (!CHANGE_KEYS.has(key)) {
      throw new ChangeEntryError(`${file}: unknown frontmatter field: ${key}`);
    }
    if (Object.hasOwn(data, key)) {
      throw new ChangeEntryError(
        `${file}: duplicate frontmatter field: ${key}`,
      );
    }

    currentList = null;

    if (raw === "") {
      data[key] = [];
      currentList = key;
    } else if (raw === "[]") {
      data[key] = [];
    } else {
      data[key] = unquote(raw);
    }
  }

  return { data, body: match[2].trim() };
}

export function parseChangeEntry(text, file) {
  const filename = path.basename(file);
  const { data, body } = parseFrontmatter(text, file);

  return {
    id: filename.replace(/\.md$/, ""),
    filename,
    file,
    packages: Array.isArray(data.packages) ? data.packages : [],
    hasPackagesList: Array.isArray(data.packages),
    type: data.type,
    breaking: data.breaking === "true",
    breakingValue: data.breaking,
    migration: typeof data.migration === "string" ? data.migration : "",
    pr: typeof data.pr === "string" ? data.pr : "",
    issue: typeof data.issue === "string" ? data.issue : "",
    adr: typeof data.adr === "string" ? data.adr : "",
    body,
  };
}

export function validateEntry(entry, packageNames) {
  const errors = [];
  const display = entry.file ?? entry.filename;

  if (!ENTRY_NAME_PATTERN.test(entry.filename)) {
    errors.push(
      `${display}: file name must match YYYYMMDD-HHmmss-<slug>-<6 hex>.md`,
    );
  }

  if (!CHANGE_TYPES.includes(entry.type)) {
    errors.push(`${display}: type must be one of ${CHANGE_TYPES.join(", ")}`);
  }

  if (!entry.hasPackagesList) {
    errors.push(`${display}: packages must be a list`);
  }

  if (new Set(entry.packages).size !== entry.packages.length) {
    errors.push(`${display}: packages must not contain duplicates`);
  }

  for (const packageName of entry.packages) {
    if (!packageNames.has(packageName)) {
      errors.push(`${display}: unknown package ${packageName}`);
    }
  }

  if (entry.breakingValue !== "true" && entry.breakingValue !== "false") {
    errors.push(`${display}: breaking must be true or false`);
  }

  if (entry.breaking && entry.migration.trim() === "") {
    errors.push(`${display}: a breaking change requires migration steps`);
  }

  if (entry.body === "") {
    errors.push(`${display}: description body must not be empty`);
  }

  for (const field of ["migration", "pr", "issue", "adr"]) {
    if (typeof entry[field] !== "string") {
      errors.push(`${display}: ${field} must be a string`);
    }
  }

  return errors;
}

function readPublicPackageNames(root) {
  const names = new Set();

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, directory, "package.json"), "utf8"),
    );
    names.add(manifest.name);
  }

  return names;
}

function readEntriesFromDirectory(directory, relativeDirectory) {
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

function readReleaseMetadata(directory, version) {
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

function linkForReference(value, kind) {
  if (value === "") {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (kind === "adr") {
    return `${REPOSITORY_URL}/blob/main/${value}`;
  }
  return `${REPOSITORY_URL}/${kind}/${value}`;
}

function renderEntry(entry) {
  const lines = [];
  const bodyLines = entry.body.split(/\r?\n/);
  const breakingPrefix = entry.breaking ? "**Breaking:** " : "";

  lines.push(`- ${breakingPrefix}${bodyLines[0]}`);
  for (const line of bodyLines.slice(1)) {
    lines.push(line === "" ? "" : `  ${line.trimEnd()}`);
  }

  if (entry.packages.length > 0) {
    lines.push(
      `  Packages: ${entry.packages
        .map((packageName) => `\`${packageName}\``)
        .join(", ")}`,
    );
  }

  if (entry.migration !== "") {
    lines.push(`  Migration: ${entry.migration}`);
  }

  const references = [];
  const pr = linkForReference(entry.pr, "pull");
  const issue = linkForReference(entry.issue, "issues");
  const adr = linkForReference(entry.adr, "adr");

  if (pr) {
    references.push(`PR: ${pr}`);
  }
  if (issue) {
    references.push(`Issue: ${issue}`);
  }
  if (adr) {
    references.push(`ADR: ${adr}`);
  }
  if (references.length > 0) {
    lines.push(`  ${references.join(" · ")}`);
  }

  return lines.join("\n");
}

function renderEntries(entries) {
  if (entries.length === 0) {
    return ["No user-facing changes recorded."];
  }

  const lines = [];

  if (entries.some((entry) => entry.breaking)) {
    lines.push(
      "> **Breaking changes are included.** Read the migration notes before upgrading.",
    );
    lines.push("");
  }

  for (const type of CHANGE_TYPES) {
    const typed = entries.filter((entry) => entry.type === type);
    if (typed.length === 0) {
      continue;
    }
    lines.push(`### ${TYPE_HEADINGS[type]}`);
    lines.push("");
    for (const entry of typed) {
      lines.push(renderEntry(entry));
      lines.push("");
    }
  }

  return lines.slice(0, -1);
}

function compareLink(version, previousVersion) {
  if (previousVersion) {
    return `${REPOSITORY_URL}/compare/v${previousVersion}...v${version}`;
  }
  return `${REPOSITORY_URL}/releases/tag/v${version}`;
}

function renderReleaseSection(release, previousVersion) {
  return [
    `## [${release.version}] - ${release.date}`,
    "",
    ...renderEntries(release.entries),
    "",
    `[${release.version}]: ${compareLink(release.version, previousVersion)}`,
  ];
}

export function renderChangelog({ unreleased, releases }) {
  const latest = releases[0]?.version;
  const lines = [
    "# Changelog",
    "",
    "All notable changes to Riebeckite are documented in this file.",
    "",
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),",
    "and Riebeckite follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)",
    "from 1.0 onward. Before 1.0, minor releases may contain breaking changes.",
    "",
    "This changelog is generated from `changes/`. Do not edit it by hand.",
    "",
    latest
      ? `Release history in this file begins with ${releases.at(-1).version}. Earlier releases are available as Git tags and GitHub Releases.`
      : "Release history in this file begins with the first release after the change-entry system was introduced. Earlier releases are available as Git tags and GitHub Releases.",
    "",
    "## [Unreleased]",
    "",
    ...renderEntries(unreleased),
    "",
    latest
      ? `[Unreleased]: ${REPOSITORY_URL}/compare/v${latest}...HEAD`
      : `[Unreleased]: ${REPOSITORY_URL}/commits/main`,
  ];

  for (let index = 0; index < releases.length; index += 1) {
    const release = releases[index];
    const previousVersion = releases[index + 1]?.version;
    lines.push("", ...renderReleaseSection(release, previousVersion));
  }

  return `${lines.join("\n")}\n`;
}

export function renderReleaseNotes({ version, date, entries, changelogUrl }) {
  return [
    `# Riebeckite v${version}`,
    "",
    `Released ${date}.`,
    "",
    ...renderEntries(entries),
    "",
    "---",
    "",
    `Full changelog: ${changelogUrl}`,
    `Compare: ${compareLink(version, null)}`,
    "",
  ].join("\n");
}

function docsPage({ header, intro, unreleased, releases, lang }) {
  const lines = [
    "---",
    `title: ${header.title}`,
    "sidebar:",
    `  label: ${header.title}`,
    "  order: 7",
    "---",
    `# ${header.title}`,
    "",
    ...intro,
    "",
    "## Unreleased",
    "",
    ...renderEntries(unreleased),
  ];

  for (let index = 0; index < releases.length; index += 1) {
    const release = releases[index];
    const previousVersion = releases[index + 1]?.version;
    lines.push(
      "",
      `## ${release.version} - ${release.date}`,
      "",
      ...renderEntries(release.entries),
      "",
      `[${lang === "ja" ? "比較" : "Compare"}](${compareLink(
        release.version,
        previousVersion,
      )})`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function renderDocsPages({ unreleased, releases }) {
  return {
    [DOCS_RELEASE_PATHS.en]: docsPage({
      lang: "en",
      header: { title: "Release Notes" },
      intro: [
        "Riebeckite release history generated from the change entries under `changes/`.",
        "",
        `The complete changelog is [CHANGELOG.md](${REPOSITORY_URL}/blob/main/CHANGELOG.md). Published releases are also available on [GitHub Releases](${REPOSITORY_URL}/releases).`,
        "",
        "The Unreleased section lists changes that are merged but not yet published to npm. Release history starts with the first release after this system was introduced; earlier versions remain available as Git tags and GitHub Releases.",
      ],
      unreleased,
      releases,
    }),
    [DOCS_RELEASE_PATHS.ja]: docsPage({
      lang: "ja",
      header: { title: "リリースノート" },
      intro: [
        "`changes/` の変更エントリから生成した Riebeckite のリリース履歴です。",
        "",
        `完全な変更履歴は [CHANGELOG.md](${REPOSITORY_URL}/blob/main/CHANGELOG.md) にあります。公開済みのリリースは [GitHub Releases](${REPOSITORY_URL}/releases) でも確認できます。`,
        "",
        "Unreleased は、マージ済みでまだ npm に公開されていない変更を示します。変更エントリの本文は記録時の原文をそのまま表示します。変更履歴はこの仕組みを導入した後の最初のリリースから始まり、それ以前のバージョンは Git タグと GitHub Releases に残っています。",
      ],
      unreleased,
      releases,
    }),
  };
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, absolutePath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function readOptional(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, "utf8")
    : null;
}

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

export function readReleaseNotes(root, version) {
  const relativePath = path.join(
    RELEASED_DIRECTORY,
    version,
    "release-notes.md",
  );
  const content = readOptional(root, relativePath);
  if (content === null) {
    throw new ChangeEntryError(`No release notes for v${version}`);
  }
  return content;
}

const usage = `Usage:
  node scripts/changelog.mjs [command]

Commands:
  check                 Validate change entries and generated files.
  build                 Regenerate CHANGELOG.md and the release notes pages.
  validate              Validate change entries only.
  notes <version>       Print the GitHub release notes for a version.
  help                  Show this help.

Change entries live in changes/unreleased/. A release moves them to
changes/released/<version>/entries/ and generates the changelog from there.`;

export function runChangelog(
  rawArguments = process.argv.slice(2),
  root = repositoryRoot,
) {
  const [command = "check", ...rest] = rawArguments;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage);
    return 0;
  }

  if (command === "check") {
    const result = checkChangelogFiles(root);
    if (result.errors.length > 0) {
      console.error("Changelog checks failed:");
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
      return 1;
    }
    console.log(
      `Changelog checked: ${result.unreleased.length} unreleased entr${
        result.unreleased.length === 1 ? "y" : "ies"
      }, ${result.releases.length} release(s).`,
    );
    return 0;
  }

  if (command === "build") {
    const result = buildChangelogFiles(root);
    console.log(
      `Changelog generated: ${result.unreleased.length} unreleased entr${
        result.unreleased.length === 1 ? "y" : "ies"
      }, ${result.releases.length} release(s).`,
    );
    return 0;
  }

  if (command === "validate") {
    const result = collectChanges(root);
    console.log(
      `Change entries valid: ${result.unreleased.length} unreleased, ${result.releases.length} release(s).`,
    );
    return 0;
  }

  if (command === "notes") {
    const version = rest[0];
    if (!version) {
      throw new ChangeEntryError(
        "Usage: node scripts/changelog.mjs notes <version>",
      );
    }
    process.stdout.write(readReleaseNotes(root, version));
    return 0;
  }

  throw new ChangeEntryError(`Unknown command: ${command}\n\n${usage}`);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isMainModule()) {
  try {
    process.exitCode = runChangelog();
  } catch (error) {
    if (error instanceof ChangeEntryError) {
      console.error(`changelog failed: ${error.message}`);
      process.exitCode = error.status;
    } else {
      throw error;
    }
  }
}
