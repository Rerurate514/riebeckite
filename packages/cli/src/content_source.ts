import {
  type ContentSource,
  FileSystemContentSource,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "./application_root.js";

export function resolveProjectContentSource(
  config: ResolvedRiebeckiteConfig,
  project: RiebeckiteProject,
): ContentSource {
  return (
    config.content.source ??
    new FileSystemContentSource(project.contentRoot, config.content.exclude)
  );
}

export function contentSourceName(config: ResolvedRiebeckiteConfig): string {
  return config.content.source ? "custom" : "filesystem";
}
