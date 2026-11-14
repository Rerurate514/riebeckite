export const PROVENANCE_VERSION = 1;

export const MAX_PROVENANCE_HISTORY = 10;

export type ProvenanceSource = {
  readonly id: string;
  readonly contentId: string;
  readonly path: string;
  readonly fingerprint: string;
  readonly type: "markdown" | "file";
  readonly visibility:
    | "public"
    | "draft"
    | "scheduled"
    | "unlisted"
    | "unknown";
  readonly evidence: "deterministic";
};

export type ProvenanceTransform = {
  readonly id: string;
  readonly type: "content-processing" | "plugin-hook" | "derived-view";
  readonly producer: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly status: "executed" | "reused" | "not-executed" | "opaque" | "failed";
  readonly evidence: "measured" | "deterministic" | "unobservable";
  readonly sequence?: number;
  readonly hook?: string;
  readonly effect?: "opaque";
  readonly durationMs?: number;
};
