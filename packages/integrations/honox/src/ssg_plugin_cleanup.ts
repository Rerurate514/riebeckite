import { rm } from "node:fs/promises";
import { discardClientBuildArtifacts } from "./ssg/build_output.js";
import type { SsgGeneration } from "./ssg_plugin_generate_prepare.js";
import type { SsgPluginState } from "./ssg_plugin_state.js";

export async function cleanupSsgGeneration(
  ctx: SsgGeneration,
  state: SsgPluginState,
): Promise<void> {
  await rm(ctx.bundleDirectory, { recursive: true, force: true });
  await discardClientBuildArtifacts(state.clientBuildArtifacts);
  if (state.clientOutputDirectory) {
    await rm(state.clientOutputDirectory, { recursive: true, force: true });
  }
  state.clientBuildArtifacts = undefined;
}
