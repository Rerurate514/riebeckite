import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { createContentSource } from "@riebeckite/node";
import type { RiebeckiteProject } from "./application_root.js";

export function resolveProjectContentSource(
  config: ResolvedRiebeckiteConfig,
  project: RiebeckiteProject,
): ContentSource {
  return createContentSource(config.content, project.contentRoot);
}

export function contentSourceName(config: ResolvedRiebeckiteConfig): string {
  return config.content.source ? "custom" : "filesystem";
}
