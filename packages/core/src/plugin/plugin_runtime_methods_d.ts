import type { ContentManifest } from "../types/content_manifest.js";
import type { GeneratedOutputSink } from "../types/generated_output.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import {
  generatedOutputSinkForImpl,
  refreshDerivedFilesImpl,
  runGeneratedOutputPlansImpl,
} from "./plugin_runtime_generated_outputs.js";
import { PluginRuntimeMethodsC } from "./plugin_runtime_methods_c.js";
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsD extends PluginRuntimeMethodsC {
  runGeneratedOutputPlans = async (manifest: ContentManifest): Promise<void> =>
    await runGeneratedOutputPlansImpl(asPluginRuntimeContext(this), manifest);

  generatedOutputSinkFor = (plugin: RiebeckitePlugin): GeneratedOutputSink =>
    generatedOutputSinkForImpl(asPluginRuntimeContext(this), plugin);

  refreshDerivedFiles = async (): Promise<void> =>
    await refreshDerivedFilesImpl(asPluginRuntimeContext(this));
}
