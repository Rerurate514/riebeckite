import type {
  FolderPagesOptions,
  ResolvedFolderPagesOptions,
} from "./types.js";

export const DEFAULT_FOLDER_PAGES_CLASS_NAME = "rr-folder-page";
export const DEFAULT_FOLDER_PAGES_PAGES_LABEL = "Pages";
export const DEFAULT_FOLDER_PAGES_FOLDERS_LABEL = "Folders";

export function resolveFolderPagesOptions(
  options: FolderPagesOptions = {},
): ResolvedFolderPagesOptions {
  return {
    className: normalizeString(
      options.className,
      DEFAULT_FOLDER_PAGES_CLASS_NAME,
    ),
    pagesLabel: normalizeString(
      options.pagesLabel,
      DEFAULT_FOLDER_PAGES_PAGES_LABEL,
    ),
    foldersLabel: normalizeString(
      options.foldersLabel,
      DEFAULT_FOLDER_PAGES_FOLDERS_LABEL,
    ),
  };
}

function normalizeString(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
