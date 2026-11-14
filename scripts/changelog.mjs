import path from "node:path";
import { pathToFileURL } from "node:url";
import { runChangelog } from "./changelog_run.mjs";
import { ChangeEntryError } from "./changelog_schema.mjs";

export {
  buildChangelogFiles,
  checkChangelogFiles,
  finalizeRelease,
} from "./changelog_build.mjs";
export { collectChanges } from "./changelog_collect.mjs";
export { renderDocsPages } from "./changelog_docs.mjs";
export { parseChangeEntry, validateEntry } from "./changelog_parse.mjs";
export { renderChangelog, renderReleaseNotes } from "./changelog_render.mjs";
export { readReleaseNotes, runChangelog } from "./changelog_run.mjs";
export {
  CHANGE_TYPES,
  CHANGELOG_PATH,
  ChangeEntryError,
  DOCS_RELEASE_PATHS,
  ENTRY_NAME_PATTERN,
  RELEASED_DIRECTORY,
  REPOSITORY_URL,
  UNRELEASED_DIRECTORY,
} from "./changelog_schema.mjs";

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
