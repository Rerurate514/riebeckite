export type ContentBuildStateInvalidReason =
  | "malformed-json"
  | "unsupported-version"
  | "invalid-shape";

export type ContentBuildStateStatus =
  | { kind: "missing"; path: string }
  | { kind: "valid"; path: string; version: number; entryCount: number }
  | {
      kind: "invalid";
      path: string;
      reason: ContentBuildStateInvalidReason;
    };
