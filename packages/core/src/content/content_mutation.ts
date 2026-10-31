export type ContentMutationContent = string | Uint8Array;

export type ContentMutationOperation =
  | {
      readonly kind: "create" | "asset-create";
      readonly path: string;
      readonly content: ContentMutationContent;
    }
  | {
      readonly kind: "update" | "asset-update";
      readonly path: string;
      readonly content: ContentMutationContent;
    }
  | { readonly kind: "delete" | "asset-delete"; readonly path: string }
  | {
      readonly kind: "move" | "rename" | "asset-move";
      readonly from: string;
      readonly to: string;
    }
  | {
      readonly kind: "frontmatter";
      readonly path: string;
      readonly set?: Readonly<Record<string, unknown>>;
      readonly remove?: readonly string[];
    }
  | {
      readonly kind: "batch";
      readonly operations: readonly ContentMutationOperation[];
    };

export type ContentMutationPrecondition = {
  readonly path: string;
  readonly fingerprint: string | null;
};

export type ContentMutationFileChange = {
  readonly path: string;
  readonly beforeFingerprint: string | null;
  readonly afterFingerprint: string | null;
  readonly content: Uint8Array | null;
};

export type ContentMutationIssue = {
  readonly severity: "warning" | "error";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
};

export type ContentMutationPlan = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly changes: readonly ContentMutationFileChange[];
  readonly preconditions: readonly ContentMutationPrecondition[];
  readonly warnings: readonly ContentMutationIssue[];
  readonly conflicts: readonly ContentMutationIssue[];
};

export type ContentMutationResult = {
  readonly planId: string;
  readonly applied: boolean;
  readonly journalPath?: string;
  readonly appliedPaths: readonly string[];
  readonly conflicts: readonly ContentMutationIssue[];
};

export type ContentMutationRecoveryResult = {
  readonly journalPath: string;
  readonly recovered: boolean;
  readonly restoredPaths: readonly string[];
  readonly conflicts: readonly ContentMutationIssue[];
};

export type ContentMutationRollbackResult = {
  readonly journalPath: string;
  readonly rolledBack: boolean;
  readonly skipped: boolean;
  readonly restoredPaths: readonly string[];
  readonly conflicts: readonly ContentMutationIssue[];
};

export function flattenContentMutationOperations(
  operations: readonly ContentMutationOperation[],
): readonly Exclude<ContentMutationOperation, { readonly kind: "batch" }>[] {
  const flattened: Exclude<
    ContentMutationOperation,
    { readonly kind: "batch" }
  >[] = [];
  for (const operation of operations) {
    if (operation.kind === "batch")
      flattened.push(...flattenContentMutationOperations(operation.operations));
    else flattened.push(operation);
  }
  return flattened;
}
