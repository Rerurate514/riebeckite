import type { ConfigEnv, Plugin } from "vite";
import { isStandaloneSsgMode } from "./ssg/standalone.js";
import { cleanupSsgGeneration } from "./ssg_plugin_cleanup.js";
import { closeSsgBundle } from "./ssg_plugin_close.js";
import { finalizeSsgGeneration } from "./ssg_plugin_generate_finalize.js";
import { prepareSsgGeneration } from "./ssg_plugin_generate_prepare.js";
import { runSsgGeneration } from "./ssg_plugin_generate_run.js";
import {
  createSsgConfigHook,
  endSsgBuild,
  loadSsgEntry,
  resolveSsgConfig,
  resolveSsgId,
  startSsgBuild,
} from "./ssg_plugin_setup.js";
import type {
  RiebeckiteSsgOptions,
  SsgPluginState,
} from "./ssg_plugin_state.js";

export { emptyBuildOutputDirectory } from "./ssg/build_output.js";
export {
  createNoChangeFastPathOutputMetrics,
  decideOutputCacheRejection,
  loadOutputCache,
  saveOutputCache,
  verifyNoChangeFastPath,
} from "./ssg/output_cache.js";
export type {
  NoChangeFastPathOutputMetrics,
  NoChangeFastPathResult,
  OutputCacheDecision,
  OutputCacheRejectionReason,
} from "./ssg/types.js";
export {
  assertRequiredOutputsWereGenerated,
  findBuildOutputSiteCollisions,
} from "./ssg_plugin_helpers.js";
export type { RiebeckiteSsgOptions } from "./ssg_plugin_state.js";

const defaultEntry = "./src/index.tsx";

export function riebeckiteSsg(options: RiebeckiteSsgOptions = {}): Plugin {
  const state: SsgPluginState = {
    virtualId: "virtual:riebeckite-ssg-void-entry",
    resolvedVirtualId: "\0virtual:riebeckite-ssg-void-entry",
    entry: options.entry ?? defaultEntry,
    resolvedConfig: undefined,
    publicationOutputDirectory: undefined,
    clientOutputDirectory: undefined,
    artifactWriter: undefined,
    pendingOutputCache: undefined,
    clientBuildArtifacts: undefined,
    outputChecksums: new Map<string, string>(),
  };

  return {
    name: "riebeckite-ssg",
    apply: (_config, env) => env.command === "build",
    enforce: "post",
    config: createSsgConfigHook(state),
    async configResolved(config) {
      await resolveSsgConfig(state, config);
    },
    async buildStart() {
      await startSsgBuild(state, this);
    },
    resolveId(id) {
      return resolveSsgId(state, id);
    },
    load(id) {
      return loadSsgEntry(state, id);
    },
    async generateBundle(_outputOptions, bundle) {
      const config = state.resolvedConfig;
      if (config?.mode === "client") return;
      if (!config) {
        throw new Error(
          "Riebeckite SSG could not resolve the Vite configuration.",
        );
      }
      const ctx = await prepareSsgGeneration(this, state, bundle);
      try {
        await runSsgGeneration(this, ctx, options);
        await finalizeSsgGeneration(this, ctx, state);
      } finally {
        await cleanupSsgGeneration(ctx, state);
      }
    },
    closeBundle: {
      order: "post",
      async handler() {
        await closeSsgBundle(this, state);
      },
    },
    async buildEnd(error) {
      await endSsgBuild(state, error);
    },
  };
}

export function shouldApplyRiebeckiteSsg(
  _config: unknown,
  env: ConfigEnv,
): boolean {
  return (
    env.command === "build" &&
    env.mode !== "client" &&
    !isStandaloneSsgMode(env.mode)
  );
}
