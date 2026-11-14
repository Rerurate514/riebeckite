import path from "node:path";
import {
  buildChangelogFiles,
  checkChangelogFiles,
} from "./changelog_build.mjs";
import { collectChanges } from "./changelog_collect.mjs";
import { readOptional } from "./changelog_docs.mjs";
import {
  ChangeEntryError,
  RELEASED_DIRECTORY,
  repositoryRoot,
} from "./changelog_schema.mjs";

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

export const usage = `Usage:
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
