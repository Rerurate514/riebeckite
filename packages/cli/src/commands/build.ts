import type { ContentManifest, Observability } from "@riebeckite/core";
import { ConsoleLogger, ContentManager, NoopTracer } from "@riebeckite/core";
import { buildHonoxApplication } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import {
  clearBuildOutputMarker,
  writeBuildOutputMarker,
} from "../build_output.js";
import { resolveProjectContentSource } from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1_000).toFixed(2)}s`;
}

export async function runBuild(
  project: RiebeckiteProject,
  options: { full: boolean; observability?: Observability },
): Promise<void> {
  const observability = options.observability ?? {
    logger: new ConsoleLogger(),
    tracer: new NoopTracer(),
  };
  const startedAt = performance.now();
  await observability.tracer.span("build.total", {}, async () => {
    const config = await loadProjectConfig(project);
    const persistentContentCache = { hits: 0, misses: 0, bypasses: 0 };
    const content = new ContentManager(
      resolveProjectContentSource(config, project),
      config.content.exclude,
      {
        config,
        observability,
        onPersistentContentCacheResult: (result) => {
          if (result === "hit") persistentContentCache.hits += 1;
          else if (result === "miss") persistentContentCache.misses += 1;
          else persistentContentCache.bypasses += 1;
        },
      },
    );

    let manifest: ContentManifest | null = null;
    try {
      manifest = await content.build({ incremental: !options.full });
    } finally {
      await content.dispose();
    }

    observability.logger.info(
      `Content: ${manifest?.entries.length ?? 0} total · ${content.getProcessedContentCount()} processed · ${content.getReusedContentCount()} reused`,
    );
    observability.logger.info(
      `Persistent content cache: ${persistentContentCache.hits} hits · ${persistentContentCache.misses} misses · ${persistentContentCache.bypasses} bypasses`,
    );

    await clearBuildOutputMarker(project);
    await buildHonoxApplication({
      root: project.appRoot,
      tracer: observability.tracer,
    });
    await writeBuildOutputMarker(project);
  });
  observability.logger.info(
    `Build complete in ${formatDuration(performance.now() - startedAt)}`,
  );
}
