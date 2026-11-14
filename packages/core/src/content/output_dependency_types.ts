import type { OutputDependency } from "../types/output_dependency.js";

export type OutputKind = "content" | "redirect" | "plugin-page" | "generated";

export type OutputDescriptor = {
  readonly kind: OutputKind;
  readonly path: string;
  readonly producer: string;
  readonly dependencies: readonly OutputDependency[];
};

export type OutputChangeReason =
  | { readonly type: "new-output" }
  | { readonly type: "kind-changed"; readonly previousKind: OutputKind }
  | { readonly type: "unknown-dependency" }
  | { readonly type: "external"; readonly id: string }
  | {
      readonly type: "derived-view";
      readonly id: string;
      readonly version: string;
    }
  | { readonly type: "derived-query"; readonly id: string }
  | { readonly type: "global" }
  | { readonly type: "content"; readonly slug: string }
  | { readonly type: "tag"; readonly tag: string }
  | { readonly type: "folder"; readonly folder: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "public-location"; readonly pathname: string }
  | {
      readonly type: "content-query";
      readonly properties: readonly string[];
      readonly unknown: boolean;
    }
  | {
      readonly type: "projection";
      readonly projection: Extract<
        OutputDependency,
        { type: "projection" }
      >["projection"];
    };

export type OutputChangeSet = {
  readonly affected: readonly OutputDescriptor[];
  readonly removed: readonly OutputDescriptor[];
  readonly unchanged: readonly OutputDescriptor[];
  readonly fullRegenerationRequired: boolean;
  readonly candidateOutputCount: number;
  readonly affectedOutputCount: number;
  readonly removedOutputCount: number;
  readonly unchangedOutputCount: number;
  readonly reasons?: ReadonlyMap<string, OutputChangeReason>;
};
