import path from "node:path";
import { repositoryUrl } from "./package_metadata.mjs";

export const CHANGE_TYPES = [
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
];

export const TYPE_HEADINGS = {
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
};

export const CHANGE_KEYS = new Set([
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

export const repositoryRoot = path.resolve(import.meta.dirname, "..");

export class ChangeEntryError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "ChangeEntryError";
    this.status = status;
  }
}
