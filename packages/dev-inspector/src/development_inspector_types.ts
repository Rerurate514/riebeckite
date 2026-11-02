import type {
  CompletedContentBuildSnapshot,
  ContentAssetInspection,
  OutputChangeReason,
  OutputDescriptor,
} from "@riebeckite/core";
import type {
  collectDevelopmentDiagnostics,
  DevelopmentDiagnostic,
} from "@riebeckite/diagnostics";
import type { ResolvedInspectorApplication } from "./application.js";

export type ListedOutput = {
  readonly path: string;
  readonly kind: string;
  readonly producer: string;
  readonly reason?: string;
};

export type OutputInspection =
  | {
      readonly status: "available";
      readonly candidateOutputCount: number;
      readonly affectedOutputCount: number;
      readonly unchangedOutputCount: number;
      readonly removedOutputCount: number;
      readonly fullRegenerationRequired: boolean;
      readonly conflicts: readonly {
        readonly path: string;
        readonly owners: readonly string[];
      }[];
      readonly affected: readonly ListedOutput[];
      readonly hiddenAffectedCount: number;
      readonly unchanged: readonly ListedOutput[];
      readonly hiddenUnchangedCount: number;
      readonly removed: readonly ListedOutput[];
      readonly hiddenRemovedCount: number;
      readonly lookups?: OutputLookups;
    }
  | { readonly status: "unavailable"; readonly reason: string };

export type OutputLookups = {
  readonly output?:
    | {
        readonly status: "found";
        readonly target: string;
        readonly output: ListedOutput;
        readonly dependencies: readonly string[];
        readonly relatedOutputs: readonly ListedOutput[];
        readonly hiddenRelatedCount: number;
      }
    | {
        readonly status: "not-found";
        readonly target: string;
      };
  readonly changed?: {
    readonly target: string;
    readonly outputCount: number;
    readonly outputs: readonly ListedOutput[];
    readonly hiddenOutputCount: number;
  };
};

export type RegenerationReason = {
  readonly kind: string;
  readonly source: string;
  readonly detail?: string;
};

export type RegenerationInspection =
  | {
      readonly status: "available";
      readonly required: boolean;
      readonly reasons: readonly RegenerationReason[];
      readonly unknown: readonly string[];
    }
  | { readonly status: "unavailable"; readonly reason: string };

export type DependencyInspection =
  | {
      readonly status: "available";
      readonly outputCount: number;
      readonly dependentOutputCount: number;
      readonly dependencyCount: number;
      readonly unknownOutputCount: number;
      readonly kinds: readonly {
        readonly kind: string;
        readonly count: number;
      }[];
      readonly outputs: readonly {
        readonly path: string;
        readonly dependencies: readonly string[];
      }[];
      readonly hiddenOutputCount: number;
    }
  | { readonly status: "unavailable"; readonly reason: string };

export type AssetResult =
  | {
      readonly status: "available";
      readonly inspection: ContentAssetInspection;
    }
  | { readonly status: "unavailable"; readonly reason: string };

export type OutputResult = {
  readonly output: OutputInspection;
  readonly dependencies: DependencyInspection;
  readonly diagnostics: readonly DevelopmentDiagnostic[];
  readonly regeneration: RegenerationInspection;
  readonly affected: readonly OutputDescriptor[];
  readonly unchanged: readonly OutputDescriptor[];
  readonly removed: readonly OutputDescriptor[];
  readonly reasons: ReadonlyMap<string, OutputChangeReason>;
};

export type OutputQuery = {
  readonly page: number;
  readonly limit: number;
  readonly query: string;
  readonly kind: string | undefined;
  readonly status: string;
  readonly changed: string | undefined;
  readonly output: string | undefined;
  readonly dependencyPage: number;
  readonly dependencyLimit: number;
  readonly dependencyQuery: string;
  readonly dependencyKind: string | undefined;
};

export type CachedInspection = {
  readonly application: ResolvedInspectorApplication;
  readonly revision: number;
  readonly snapshot: Promise<CompletedContentBuildSnapshot | undefined>;
  readonly report: Promise<
    Awaited<ReturnType<typeof collectDevelopmentDiagnostics>>
  >;
  readonly output: Promise<OutputResult>;
  readonly assets: Promise<AssetResult>;
  readonly settlement: Promise<void>;
};

export type ContentAppModule = {
  readonly content?: {
    getCompletedBuildSnapshot(): CompletedContentBuildSnapshot | undefined;
  };
};
