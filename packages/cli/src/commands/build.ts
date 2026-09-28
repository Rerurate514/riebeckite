import path from "node:path";
import { ConsoleLogger, ContentManager, NoopTracer } from "@riebeckite/core";
import type { Observability } from "@riebeckite/core";
import {
  buildHonoxApplication,
  resolveHonoxApplicationRoot,
} from "@riebeckite/honox";
import type { RiebeckiteApplication } from "../application_root";
import { loadApplicationConfig } from "../load_config";

export async function runBuild(
  application: RiebeckiteApplication,
  options: { full: boolean; observability?: Observability },
): Promise<void> {
  const observability = options.observability ?? {
    logger: new ConsoleLogger(),
    tracer: new NoopTracer(),
  };
  await observability.tracer.span("build.total", {}, async () => {
    const config = await loadApplicationConfig(application);
    const hostRoot = await resolveHonoxApplicationRoot(
      application.applicationRoot,
    );
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
