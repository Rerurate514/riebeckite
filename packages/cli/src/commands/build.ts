import type { Observability } from "@riebeckite/core";
import { ConsoleLogger, ContentManager, NoopTracer } from "@riebeckite/core";
import { buildHonoxApplication } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { resolveProjectContentSource } from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";

export async function runBuild(
  project: RiebeckiteProject,
  options: { full: boolean; observability?: Observability },
): Promise<void> {
  const observability = options.observability ?? {
    logger: new ConsoleLogger(),
    tracer: new NoopTracer(),
  };
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

    try {
      await content.build({ incremental: !options.full });
    } finally {
      await content.dispose();
    }

    observability.logger.info(
      "Persistent content cache",
      persistentContentCache,
    );

    await buildHonoxApplication({
      root: project.appRoot,
      tracer: observability.tracer,
    });
  });
}
