import type {
  ContentQueryFilter,
  ContentQuerySort,
} from "../content/content_query.js";
import type { JsonValue, PluginCache } from "../plugin/plugin_cache.js";
import type { ContentManifestEntry } from "../types/content_manifest.js";

export type DerivedSchema<T> = {
  parse(value: unknown): T;
};

export type DerivedContentQuery = {
  readonly pool?: "discoverable" | "routable";
  readonly filter?: ContentQueryFilter;
  readonly sort?: ContentQuerySort | readonly ContentQuerySort[];
  readonly limit?: number;
  readonly offset?: number;
};

export type DerivedQueryOptions = {
  readonly where?: (entry: ContentManifestEntry) => boolean;
};

export type DerivedTrackedDependency = {
  readonly type: "content" | "frontmatter" | "file" | "external" | "unknown";
  readonly id: string;
  readonly property?: string;
};

export type DerivedDependency = {
  readonly type:
    | "content"
    | "frontmatter"
    | "file"
    | "external"
    | "query"
    | "view"
    | "unknown";
  readonly id: string;
  readonly fingerprint?: string;
  readonly property?: string;
  readonly query?: DerivedContentQuery;
};

export type DerivedViewResolution<TResult> = {
  readonly value: TResult;
  readonly dependencies: readonly DerivedDependency[];
  readonly viewIds: readonly string[];
};

export type DerivedViewExecution = {
  readonly id: string;
  readonly version: string;
  readonly dependencies: readonly DerivedDependency[];
  readonly cache: "hit" | "miss" | "bypass" | "not-run";
  readonly recomputeReason?: string;
  readonly durationMs: number;
  readonly error?: "failed" | "cancelled";
};

export type DerivedViewContext = {
  readonly signal: AbortSignal;
  readonly dependencies: readonly DerivedDependency[];
  track(dependency: DerivedTrackedDependency): void;
  query(
    id: string,
    query: DerivedContentQuery,
    options?: DerivedQueryOptions,
  ): readonly ContentManifestEntry[];
  resolve<TResult>(view: string, input: unknown): Promise<TResult>;
  resolve<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
  ): Promise<TResult>;
};

export type DerivedView<TInput, TResult> = {
  readonly id: string;
  readonly version: string;
  readonly input?: DerivedSchema<TInput>;
  readonly output?: DerivedSchema<TResult>;
  readonly compute: {
    bivarianceHack(
      input: TInput,
      context: DerivedViewContext,
    ): TResult | Promise<TResult>;
  }["bivarianceHack"];
};

export type DerivedViewOptions<TInput, TResult> = DerivedView<TInput, TResult>;

export type DerivedViewStatus = {
  readonly id: string;
  readonly version: string;
  readonly pending: number;
};

export type DerivedViewRegistry = {
  register<TInput, TResult>(view: DerivedView<TInput, TResult>): void;
  resolve<TResult>(
    view: string,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<TResult>;
  resolve<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
    options?: { signal?: AbortSignal },
  ): Promise<TResult>;
  resolveWithDependencies<TResult>(
    view: string,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<DerivedViewResolution<TResult>>;
  resolveWithDependencies<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
    options?: { signal?: AbortSignal },
  ): Promise<DerivedViewResolution<TResult>>;
  status(): readonly DerivedViewStatus[];
  versionOf(id: string): string | undefined;
  inspect(): readonly DerivedViewExecution[];
  dispose(): void;
};

export type CacheEntry = {
  readonly version: string;
  readonly input: string;
  readonly value: JsonValue;
  readonly dependencies: CachedDependency[];
};

export type CachedDependency = {
  type: DerivedDependency["type"];
  id: string;
  fingerprint: string;
  property?: string;
  query?: DerivedContentQuery;
};

export type PendingView = {
  readonly controller: AbortController;
  readonly promise: Promise<DerivedViewResolution<unknown>>;
  consumers: number;
};

export type DerivedViewRegistryOptions = {
  readonly cache?: () => PluginCache;
  readonly queryEntries?: (
    pool: "discoverable" | "routable",
  ) => readonly ContentManifestEntry[];
  readonly dependencyFingerprint?: (
    dependency: Omit<DerivedDependency, "fingerprint">,
  ) => string | undefined;
};
