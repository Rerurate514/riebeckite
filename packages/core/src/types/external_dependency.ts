export type ExternalDependencyScope =
  | { readonly type: "content" }
  | { readonly type: "output"; readonly paths: readonly string[] }
  | { readonly type: "all" };

export type ExternalDependencySnapshot<T = unknown> = {
  readonly id: string;
  readonly fingerprint: string;
  readonly scope: ExternalDependencyScope;
  readonly expiresAt?: string;
  readonly value: T;
};

export type ExternalDependencyFailure = {
  readonly id: string;
  readonly reason: string;
};

export type ExternalDependencyResolution<T = unknown> =
  | {
      readonly kind: "resolved";
      readonly snapshot: ExternalDependencySnapshot<T>;
    }
  | {
      readonly kind: "unavailable";
      readonly failure: ExternalDependencyFailure;
    };

export type ExternalDependencyContext = {
  readonly config?: import("./resolved_riebeckite_config.js").ResolvedRiebeckiteConfig;
  readonly contentIndex: Map<string, string>;
  readonly cache: import("../plugin/plugin_cache.js").PluginCache;
};
