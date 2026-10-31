import type { ContentManifest } from "@riebeckite/core";
import { ContentManager, NoopLogger, NoopTracer } from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { resolveProjectContentSource } from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";

/**
 * Builds the content manifest without running SSG. The planner reads the
 * already-resolved publishing state from the manifest, so scheduling and
 * visibility keep one implementation.
 */
export async function loadPublicationManifest(
  project: RiebeckiteProject,
  buildTime: Date,
): Promise<ContentManifest> {
  const config = await loadProjectConfig(project);
  const content = new ContentManager(
    resolveProjectContentSource(config, project),
    config.content.exclude,
    {
      config,
      observability: { logger: new NoopLogger(), tracer: new NoopTracer() },
      commitBuildState: false,
      publishingBuildTime: buildTime,
    },
  );
  try {
    return await content.build({ incremental: true });
  } finally {
    await content.dispose();
  }
}
