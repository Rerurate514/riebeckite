import type { toSSG } from "hono/ssg";
import type { ResolvedConfig } from "vite";
import type { BuildArtifactWriter } from "./ssg/artifact_writer.js";
import type { ClientBuildArtifacts } from "./ssg/build_output.js";
import type { OutputCacheState } from "./ssg/output_cache.js";
import type {
  SsgModule,
  SsgOutputChangeSet,
  SsgOutputMetrics,
} from "./ssg/types.js";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

export type RiebeckiteSsgOptions = {
  entry?: string;
  plugins?: ToSsgOptions["plugins"];
  extensionMap?: Record<string, string>;
  concurrency?: number;
};

export type PendingOutputCache = {
  path: string;
  state: OutputCacheState;
  metrics: SsgOutputMetrics;
  timingsMs: Record<string, number> | undefined;
  outDir: string;
  publicDir: string | false | undefined;
  configFile: string | undefined;
  publicationFingerprint?: string;
  outputPlanInput: {
    inventory: SsgOutputChangeSet["affected"];
    affectedPaths: ReadonlySet<string>;
    removed: SsgOutputChangeSet["removed"];
    cacheAvailable: boolean;
    honoStaticRoutePaths: ReadonlySet<string>;
    viteClientAssetPaths: ReadonlySet<string>;
    sitePublicAssetPaths: ReadonlySet<string>;
  };
  provenance: ReturnType<NonNullable<SsgModule["content"]>["getProvenance"]>;
  content: NonNullable<SsgModule["content"]> | undefined;
  reusablePaths: ReadonlySet<string>;
};

export type SsgPluginLogger = {
  warn(message: string): void;
  info(message: string): void;
};

export interface SsgPluginState {
  virtualId: string;
  resolvedVirtualId: string;
  entry: string;
  resolvedConfig: ResolvedConfig | undefined;
  publicationOutputDirectory: string | undefined;
  clientOutputDirectory: string | undefined;
  artifactWriter: BuildArtifactWriter | undefined;
  pendingOutputCache: PendingOutputCache | undefined;
  clientBuildArtifacts: ClientBuildArtifacts | undefined;
  outputChecksums: Map<string, string>;
}
