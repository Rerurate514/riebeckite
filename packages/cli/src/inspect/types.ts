export type ApplicationInspection = {
  readonly root: string;
  readonly configPath: string;
  readonly content: {
    readonly source: string;
    readonly entryCount: number;
  };
  readonly plugins: {
    readonly enabledCount: number;
    readonly capabilityCount: number;
  };
  readonly build: BuildInspection;
};

export type ConfigInspection = {
  readonly site: {
    readonly title: string;
    readonly baseUrl: string;
    readonly locale: string;
  };
  readonly content: {
    readonly source: string;
    readonly directory: string;
    readonly excludeCount: number;
    readonly publishStrategy: string;
  };
  readonly theme: {
    readonly name: string;
    readonly colorMode: string;
  };
  readonly pluginCount: number;
};

export type PluginInspection = {
  readonly name: string;
  readonly order: number;
  readonly enabled: boolean;
  readonly provides: readonly string[];
  readonly requires: readonly string[];
  readonly optional: readonly string[];
};

export type ContentInspection = {
  readonly source: string;
  readonly entryCount: number;
  readonly extensions: readonly {
    readonly extension: string;
    readonly count: number;
  }[];
  readonly paths: readonly {
    readonly path: string;
    readonly id?: string;
    readonly idSource?: string;
    readonly permalink?: string;
  }[];
};

export type GraphInspection = {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly mostLinked: readonly {
    readonly path: string;
    readonly incomingCount: number;
  }[];
};

export type BuildInspection =
  | { readonly status: "not created" }
  | {
      readonly status: "valid";
      readonly version: number;
      readonly entryCount: number;
    }
  | { readonly status: "invalid" };
