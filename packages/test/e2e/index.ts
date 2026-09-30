/**
 * A reusable, monorepo-agnostic engine for testing a built site end to end
 * against locally packed tarballs.
 *
 * The engine owns the mechanical sequence and knows nothing about any specific
 * repository. Callers inject the repository root, package list, fixtures, CLI
 * shape, assertion callbacks, and keep-temp variable through
 * {@link runExternalSiteE2E}. Lower-level primitives are exported so a
 * repository can compose its own flow.
 */

export {
  type AssertDeclaredDependenciesOptions,
  type AssertIsolatedInstallOptions,
  type AssertNoMonorepoEscapeHatchesOptions,
  type AssertPublishedArtifactsOptions,
  assertDeclaredDependencies,
  assertIsolatedInstall,
  assertNoMonorepoEscapeHatches,
  assertPublishedArtifacts,
  type RequiredInstallPath,
} from "./assertions.js";
export {
  cliText,
  type RunCliOptions,
  runCli,
  runTypecheck,
} from "./cli.js";

export {
  type FilePredicate,
  walkFiles,
} from "./files.js";

export { formatBytes } from "./format.js";

export { escapeRegExp, extractScriptPayloads } from "./html.js";
export { createLogger, type Logger } from "./logger.js";
export {
  type PackageSpec,
  type PackedPackage,
  type PackedPackages,
  type PackPackagesOptions,
  packPackages,
} from "./pack.js";
export {
  MAX_BUFFER,
  quote,
  type RunOptions,
  type RunResult,
  run,
  runAsync,
} from "./process.js";
export {
  type CliCommandSpec,
  type ExternalSiteAssertions,
  type ExternalSiteE2EConfig,
  type ExternalSiteFixture,
  type ExternalSiteWorkspace,
  runExternalSiteE2E,
  type SiteCheck,
} from "./run.js";
export {
  type LayerExternalConsumerTypesOptions,
  layerExternalConsumerTypes,
  type NodeNextProjectSpec,
  type StageIsolatedSiteOptions,
  stageIsolatedSite,
  writeFileDependencies,
} from "./stage.js";
