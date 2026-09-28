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
    const content = new ContentManager(
      resolveProjectContentSource(config, project),
      config.content.exclude,
      {
        config,
        observability,
      },
    );

    try {
      await content.build({ incremental: !options.full });
    } finally {
      await content.dispose();
    }

    await buildHonoxApplication({
      root: project.appRoot,
      tracer: observability.tracer,
    });
  });
}
