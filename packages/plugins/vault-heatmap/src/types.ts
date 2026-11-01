export type VaultHeatmapWeekStart = "sunday" | "monday";

export type VaultHeatmapOptions = {
  /** Fenced code block language treated as a heatmap. */
  language?: string;
  /** Number of week columns. */
  weeks?: number;
  /** Visible caption. */
  title?: string;
  /** First day of each week column. */
  weekStart?: VaultHeatmapWeekStart;
};

export type VaultHeatmapSpec = {
  readonly weeks: number;
  readonly title: string;
  readonly end?: string;
  readonly weekStart: VaultHeatmapWeekStart;
};

export type VaultActivityDay = {
  readonly created: number;
  readonly modified: number;
};

export type VaultActivity = {
  readonly earliest: string | null;
  readonly latest: string | null;
  readonly total: number;
  readonly activeDays: number;
  readonly days: Readonly<Record<string, VaultActivityDay>>;
};

export type VaultHeatmapInput = {
  readonly entries: readonly {
    readonly slug: string;
    readonly created?: string;
    readonly modified?: string;
    readonly updated?: string;
  }[];
};

export type VaultHeatmapParseResult =
  | { readonly ok: true; readonly spec: VaultHeatmapSpec }
  | { readonly ok: false; readonly reason: string };
