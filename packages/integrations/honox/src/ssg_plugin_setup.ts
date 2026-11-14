import { join, resolve } from "node:path";
import type { ConfigEnv, ResolvedConfig } from "vite";
import { createBuildArtifactWriter } from "./ssg/artifact_writer.js";
import {
  emptyBuildOutputDirectory,
  preserveClientBuildArtifacts,
} from "./ssg/build_output.js";
import { logSsgDiagnostics } from "./ssg/diagnostics.js";
import type { SsgPluginLogger, SsgPluginState } from "./ssg_plugin_state.js";

export function createSsgConfigHook(state: SsgPluginState) {
  return (
    config: { root?: string; build?: { outDir?: string } },
    env: ConfigEnv,
  ) => {
    const root = resolve(config.root ?? process.cwd());
    state.publicationOutputDirectory = resolve(
      root,
      config.build?.outDir ?? "dist",
    );
    state.clientOutputDirectory = join(
      root,
      ".riebeckite",
      "build-output-client",
    );
    return {
      build: {
        outDir:
          env.mode === "client"
            ? state.clientOutputDirectory
            : join(root, ".riebeckite", "build-output"),
        ...(env.mode === "client"
          ? {}
          : { rollupOptions: { input: [state.virtualId] } }),
      },
    };
  };
}

export async function resolveSsgConfig(
  state: SsgPluginState,
  config: ResolvedConfig,
): Promise<void> {
  state.resolvedConfig = config;
  if (config.mode === "client") {
    state.clientOutputDirectory = resolve(config.root, config.build.outDir);
    return;
  }
  await emptyBuildOutputDirectory(resolve(config.root, config.build.outDir));
}

export async function startSsgBuild(
  state: SsgPluginState,
  plugin: SsgPluginLogger,
): Promise<void> {
  const config = state.resolvedConfig;
  if (!config || config.mode === "client") return;
  state.outputChecksums.clear();
  if (!state.publicationOutputDirectory) {
    throw new Error(
      "Riebeckite SSG could not resolve the publication output directory.",
    );
  }
  state.artifactWriter = await createBuildArtifactWriter({
    outputDirectory: state.publicationOutputDirectory,
    stagingDirectory: resolve(config.root, config.build.outDir),
  });
  const outDir = resolve(config.root, config.build.outDir);
  state.clientBuildArtifacts = state.clientOutputDirectory
    ? await preserveClientBuildArtifacts(state.clientOutputDirectory)
    : undefined;
  if (!state.clientBuildArtifacts) {
    state.clientBuildArtifacts = await preserveClientBuildArtifacts(
      state.publicationOutputDirectory,
    );
  }
  if (!state.clientBuildArtifacts) {
    return;
  }
  logSsgDiagnostics(
    plugin,
    `client manifest ${state.clientBuildArtifacts ? `preserved (${state.clientBuildArtifacts.paths.length} files)` : "not found"}`,
  );
  await emptyBuildOutputDirectory(outDir);
}

export function resolveSsgId(
  state: SsgPluginState,
  id: string,
): string | undefined {
  return id === state.virtualId ? state.resolvedVirtualId : undefined;
}

export function loadSsgEntry(
  state: SsgPluginState,
  id: string,
): string | undefined {
  return id === state.resolvedVirtualId
    ? 'console.log("suppress empty chunk message")'
    : undefined;
}

export async function endSsgBuild(
  state: SsgPluginState,
  error: Error | undefined,
): Promise<void> {
  if (!error || !state.artifactWriter) return;
  await state.artifactWriter.discard();
  state.artifactWriter = undefined;
  state.pendingOutputCache = undefined;
}
