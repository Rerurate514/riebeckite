import { ConsoleLogger, SinkTracer } from "@riebeckite/core";
import type { RiebeckiteApplication } from "../application_root";
import { renderProfile } from "../profile/renderer";
import { ProfileTraceSink } from "../profile/profile_trace_sink";
import { runBuild } from "./build";

export async function runProfile(
  application: RiebeckiteApplication,
  options: { full: boolean },
): Promise<void> {
  const sink = new ProfileTraceSink();
  try {
    await runBuild(application, {
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
