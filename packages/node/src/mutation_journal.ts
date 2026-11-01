import type {
  ContentMutationFileChange,
  ContentMutationOperation,
  ContentMutationPlan,
} from "@riebeckite/core";

export type MutationJournal = {
  readonly version: 1;
  readonly id: string;
  state:
    | "prepared"
    | "applying"
    | "failed"
    | "complete"
    | "recovered"
    | "rolled-back";
  readonly changes: readonly JournalChange[];
};

type StoredMutationPlan = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly operations: unknown;
  readonly changes: readonly StoredFileChange[];
  readonly preconditions: ContentMutationPlan["preconditions"];
  readonly warnings: ContentMutationPlan["warnings"];
  readonly conflicts: ContentMutationPlan["conflicts"];
};

type StoredFileChange = Omit<ContentMutationFileChange, "content"> & {
  readonly content: string | null;
};

export type JournalChange = {
  readonly path: string;
  readonly beforeFingerprint: string | null;
  readonly afterFingerprint: string | null;
  readonly backupPath?: string;
  status: "pending" | "applied";
};

export function markApplied(journal: MutationJournal, filePath: string): void {
  const change = journal.changes.find(
    (candidate) => candidate.path === filePath,
  );
  if (!change) throw new Error(`Journal change is missing: ${filePath}`);
  change.status = "applied";
}

export function parseJournal(value: string): MutationJournal {
  const journal = JSON.parse(value) as Partial<MutationJournal>;
  if (
    journal.version !== 1 ||
    typeof journal.id !== "string" ||
    !Array.isArray(journal.changes) ||
    ![
      "prepared",
      "applying",
      "failed",
      "complete",
      "recovered",
      "rolled-back",
    ].includes(journal.state ?? "")
  )
    throw new Error("Journal is missing or corrupt.");
  return journal as MutationJournal;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializePlan(plan: ContentMutationPlan): StoredMutationPlan {
  return {
    ...plan,
    operations: serializeOperations(plan.operations),
    changes: plan.changes.map((change) => ({
      ...change,
      content:
        change.content === null
          ? null
          : Buffer.from(change.content).toString("base64"),
    })),
  };
}

export function parsePlan(value: string): ContentMutationPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Mutation plan is missing or corrupt.");
  }
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.id !== "string"
  )
    throw new Error("Mutation plan is missing or corrupt.");
  if (
    !Array.isArray(parsed.operations) ||
    !Array.isArray(parsed.changes) ||
    !Array.isArray(parsed.preconditions) ||
    !Array.isArray(parsed.warnings) ||
    !Array.isArray(parsed.conflicts)
  )
    throw new Error("Mutation plan is missing or corrupt.");
  const changes = parsed.changes.map((change) => {
    const serializedContent = isRecord(change) ? change.content : undefined;
    if (
      !isRecord(change) ||
      typeof change.path !== "string" ||
      !isFingerprint(change.beforeFingerprint) ||
      !isFingerprint(change.afterFingerprint)
    )
      throw new Error("Mutation plan is missing or corrupt.");
    if (serializedContent !== null && typeof serializedContent !== "string")
      throw new Error("Mutation plan is missing or corrupt.");
    const content =
      serializedContent === null
        ? null
        : new Uint8Array(Buffer.from(serializedContent as string, "base64"));
    if ((content === null) !== (change.afterFingerprint === null))
      throw new Error("Mutation plan is missing or corrupt.");
    return {
      path: change.path,
      beforeFingerprint: change.beforeFingerprint,
      afterFingerprint: change.afterFingerprint,
      content,
    };
  });
  return {
    schemaVersion: 1,
    id: parsed.id,
    operations: parseOperations(parsed.operations),
    changes,
    preconditions: parsed.preconditions as ContentMutationPlan["preconditions"],
    warnings: parsed.warnings as ContentMutationPlan["warnings"],
    conflicts: parsed.conflicts as ContentMutationPlan["conflicts"],
  };
}

export function samePlan(
  expected: ContentMutationPlan,
  actual: ContentMutationPlan,
): boolean {
  return (
    canonicalPlan(expected) === canonicalPlan(actual) &&
    expected.conflicts.length === actual.conflicts.length
  );
}

function canonicalPlan(plan: ContentMutationPlan): string {
  return JSON.stringify({
    operations: serializeOperations(plan.operations),
    changes: serializePlan(plan).changes,
    preconditions: plan.preconditions,
    conflicts: plan.conflicts,
  });
}

function serializeOperations(
  operations: readonly ContentMutationOperation[],
): unknown {
  return operations.map((operation) => {
    if (operation.kind === "batch")
      return {
        ...operation,
        operations: serializeOperations(operation.operations),
      };
    if ("content" in operation)
      return {
        ...operation,
        content:
          typeof operation.content === "string"
            ? { encoding: "utf8", value: operation.content }
            : {
                encoding: "base64",
                value: Buffer.from(operation.content).toString("base64"),
              },
      };
    return operation;
  });
}

function parseOperations(value: unknown): ContentMutationOperation[] {
  if (!Array.isArray(value))
    throw new Error("Mutation plan is missing or corrupt.");
  return value.map((operation) => {
    if (!isRecord(operation) || typeof operation.kind !== "string")
      throw new Error("Mutation plan is missing or corrupt.");
    if (operation.kind === "batch")
      return {
        kind: "batch",
        operations: parseOperations(operation.operations),
      };
    if (
      operation.kind === "create" ||
      operation.kind === "asset-create" ||
      operation.kind === "update" ||
      operation.kind === "asset-update"
    ) {
      if (
        typeof operation.path !== "string" ||
        !isRecord(operation.content) ||
        typeof operation.content.value !== "string"
      )
        throw new Error("Mutation plan is missing or corrupt.");
      if (operation.content.encoding === "utf8")
        return {
          kind: operation.kind,
          path: operation.path,
          content: operation.content.value,
        };
      if (operation.content.encoding === "base64")
        return {
          kind: operation.kind,
          path: operation.path,
          content: new Uint8Array(
            Buffer.from(operation.content.value, "base64"),
          ),
        };
      throw new Error("Mutation plan is missing or corrupt.");
    }
    if (operation.kind === "delete" || operation.kind === "asset-delete") {
      if (typeof operation.path !== "string")
        throw new Error("Mutation plan is missing or corrupt.");
      return { kind: operation.kind, path: operation.path };
    }
    if (
      operation.kind === "move" ||
      operation.kind === "rename" ||
      operation.kind === "asset-move"
    ) {
      if (
        typeof operation.from !== "string" ||
        typeof operation.to !== "string"
      )
        throw new Error("Mutation plan is missing or corrupt.");
      return { kind: operation.kind, from: operation.from, to: operation.to };
    }
    if (operation.kind === "frontmatter") {
      if (typeof operation.path !== "string")
        throw new Error("Mutation plan is missing or corrupt.");
      return {
        kind: "frontmatter",
        path: operation.path,
        ...(isRecord(operation.set) ? { set: operation.set } : {}),
        ...(Array.isArray(operation.remove) &&
        operation.remove.every((item) => typeof item === "string")
          ? { remove: operation.remove }
          : {}),
      };
    }
    throw new Error("Mutation plan is missing or corrupt.");
  });
}

function isFingerprint(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && /^[a-f0-9]{64}$/.test(value))
  );
}
