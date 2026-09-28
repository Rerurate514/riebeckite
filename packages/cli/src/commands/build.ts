import path from "node:path";
import type { Observability } from "@riebeckite/core";
import { ConsoleLogger, ContentManager, NoopTracer } from "@riebeckite/core";
import {
  buildHonoxApplication,
  resolveHonoxApplicationRoot,
} from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
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
    const hostRoot = await resolveHonoxApplicationRoot(project.configRoot);
    const contentDirectory = path.resolve(hostRoot, config.content.directory);
    const content = new ContentManager(
      contentDirectory,
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
      root: hostRoot,
      tracer: observability.tracer,
    });
  });
}
