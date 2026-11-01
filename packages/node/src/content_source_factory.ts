import type { ContentSource } from "@riebeckite/core";
import { FileSystemContentSource } from "./file_system_content_source.js";

export type ContentSourceConfig = {
  readonly source?: ContentSource;
  readonly directory: string;
  readonly exclude?: readonly string[];
};

export function createContentSource(
  config: ContentSourceConfig,
  directory: string = config.directory,
): ContentSource {
  return (
    config.source ??
    new FileSystemContentSource(directory, config.exclude ?? [])
  );
}
