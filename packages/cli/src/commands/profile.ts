import { ConsoleLogger, SinkTracer } from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root";
import { ProfileTraceSink } from "../profile/profile_trace_sink";
import { renderProfile } from "../profile/renderer";
import { runBuild } from "./build";

export async function runProfile(
  project: RiebeckiteProject,
  options: { full: boolean },
): Promise<void> {
  const sink = new ProfileTraceSink();
  try {
    await runBuild(project, {
      full: options.full,
      observability: {
        logger: new ConsoleLogger(),
        tracer: new SinkTracer(sink),
      },
    });
  } catch (error) {
    console.log(renderProfile(sink.createReport(), true));
    throw error;
  }
  console.log(renderProfile(sink.createReport()));
}
