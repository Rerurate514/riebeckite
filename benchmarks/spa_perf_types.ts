export type Mode = "off" | "on" | "hover";

export interface Sample {
  readonly initialMs: number;
  readonly navigationMs: number;
  readonly prefetch: {
    readonly beforeClick: { readonly requests: number; readonly bytes: number };
    readonly afterClick: { readonly requests: number; readonly bytes: number };
  };
}

export interface Summary {
  readonly median: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly spread: number;
}

export interface Result {
  readonly environment: Record<string, string | number>;
  readonly fixture: string;
  readonly samples: number;
  readonly modes: Record<
    Mode,
    {
      readonly buildMs: readonly number[];
      readonly initial: Summary;
      readonly navigation: Summary;
      readonly prefetch: {
        readonly beforeClick: {
          readonly requests: number;
          readonly bytes: number;
        };
        readonly afterClick: {
          readonly requests: number;
          readonly bytes: number;
        };
      };
      readonly memoryBytes: Record<string, number>;
      readonly bundles: {
        readonly raw: number;
        readonly gzip: number;
        readonly brotli: number;
      };
    }
  >;
}
