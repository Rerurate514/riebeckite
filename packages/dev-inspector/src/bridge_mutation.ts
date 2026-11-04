import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentMutationOperation,
  ContentMutationPlan,
} from "@riebeckite/core";
import { FileSystemContentMutation } from "@riebeckite/node";

const approvalLifetimeMs = 5 * 60 * 1000;

type StoredPlan = { readonly hash: string; readonly plan: EncodedValue };
type StoredApproval = {
  readonly planId: string;
  readonly planHash: string;
  readonly expiresAt: number;
  readonly used: boolean;
  readonly signature: string;
};
type EncodedValue =
  | null
  | boolean
  | number
  | string
  | { readonly bytes: string }
  | { readonly array: readonly EncodedValue[] }
  | { readonly object: Readonly<Record<string, EncodedValue>> };

export type BridgeMutationPlanReview = {
  readonly id: string;
  readonly hash: string;
  readonly changes: ContentMutationPlan["changes"];
  readonly warnings: ContentMutationPlan["warnings"];
};

export type BridgeMutationStore = {
  plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan>;
  apply(planId: string): Promise<unknown>;
};

export function createBridgeMutationStore(
  contentRoot: string,
  approvalSecret: string,
): BridgeMutationStore {
  const mutation = new FileSystemContentMutation(contentRoot);
  return {
    async plan(operations) {
      const plan = await mutation.plan(operations);
      const stored = { hash: hashPlan(plan), plan: encode(plan) };
      await writeJson(planPath(contentRoot, plan.id), stored);
      return plan;
    },
    async apply(planId) {
      const stored = await readPlan(contentRoot, planId);
      const plan = stored
        ? (decode(stored.plan) as ContentMutationPlan)
        : undefined;
      if (
        !stored ||
        !plan ||
        plan.id !== planId ||
        hashPlan(plan) !== stored.hash
      )
        return rejected(planId, "plan-not-found");
      const approval = await readApproval(contentRoot, planId);
      if (!approval) return rejected(planId, "approval-required");
      if (approval.planId !== planId || approval.planHash !== stored.hash)
        return rejected(planId, "approval-invalid");
      if (approval.used) return rejected(planId, "approval-used");
      if (approval.expiresAt <= Date.now())
        return rejected(planId, "approval-expired");
      if (!validSignature(approval, approvalSecret))
        return rejected(planId, "approval-invalid");
      if (!(await claimApproval(contentRoot, planId)))
        return rejected(planId, "approval-claim-conflict");
      await writeJson(approvalPath(contentRoot, planId), {
        ...approval,
        used: true,
      });
      return mutation.apply(plan);
    },
  };
}

export async function reviewBridgeMutationPlan(
  contentRoot: string,
  planId: string,
): Promise<BridgeMutationPlanReview | undefined> {
  const stored = await readPlan(contentRoot, planId);
  if (!stored) return undefined;
  const plan = decode(stored.plan) as ContentMutationPlan;
  if (plan.id !== planId || hashPlan(plan) !== stored.hash) return undefined;
  return {
    id: plan.id,
    hash: stored.hash,
    changes: plan.changes,
    warnings: plan.warnings,
  };
}

export async function approveBridgeMutationPlan(
  contentRoot: string,
  planId: string,
  approvalSecret: string,
): Promise<{ expiresAt: string } | undefined> {
  const review = await reviewBridgeMutationPlan(contentRoot, planId);
  if (!review) return undefined;
  const expiresAt = Date.now() + approvalLifetimeMs;
  const unsigned = {
    planId,
    planHash: review.hash,
    expiresAt,
    used: false,
  };
  const approval = { ...unsigned, signature: sign(unsigned, approvalSecret) };
  try {
    await fs.access(approvalPath(contentRoot, planId));
    return undefined;
  } catch {
    await writeJson(approvalPath(contentRoot, planId), approval);
    return { expiresAt: new Date(expiresAt).toISOString() };
  }
}

export function isMutationOperations(
  value: unknown,
): value is readonly ContentMutationOperation[] {
  return Array.isArray(value) && value.length > 0;
}

function rejected(planId: string, code: string) {
  return { planId, applied: false, conflicts: [{ code }] };
}

function planPath(root: string, id: string): string {
  return path.join(
    root,
    ".riebeckite",
    "bridge",
    "plans",
    `${safeId(id)}.json`,
  );
}

function approvalPath(root: string, id: string): string {
  return path.join(
    root,
    ".riebeckite",
    "bridge",
    "approvals",
    `${safeId(id)}.json`,
  );
}

function safeId(value: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("Invalid mutation ID.");
  return value;
}

async function readPlan(
  root: string,
  id: string,
): Promise<StoredPlan | undefined> {
  try {
    const value = JSON.parse(
      await fs.readFile(planPath(root, id), "utf8"),
    ) as StoredPlan;
    return typeof value.hash === "string" && value.plan !== undefined
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

async function readApproval(
  root: string,
  id: string,
): Promise<StoredApproval | undefined> {
  try {
    const value = JSON.parse(
      await fs.readFile(approvalPath(root, id), "utf8"),
    ) as StoredApproval;
    return typeof value.planId === "string" &&
      typeof value.planHash === "string" &&
      typeof value.expiresAt === "number" &&
      typeof value.used === "boolean" &&
      typeof value.signature === "string"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(temporary, file);
}

async function claimApproval(
  root: string,
  approvalId: string,
): Promise<boolean> {
  const claim = `${approvalPath(root, approvalId)}.used`;
  await fs.mkdir(path.dirname(claim), { recursive: true });
  try {
    const handle = await fs.open(claim, "wx", 0o600);
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

function hashPlan(plan: ContentMutationPlan): string {
  return crypto
    .createHash("sha256")
    .update(stableJson(encode(plan)))
    .digest("hex");
}

function sign(
  value: Omit<StoredApproval, "signature">,
  secret: string,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(stableJson(value))
    .digest("hex");
}

function validSignature(approval: StoredApproval, secret: string): boolean {
  const expected = sign(
    {
      planId: approval.planId,
      planHash: approval.planHash,
      expiresAt: approval.expiresAt,
      used: approval.used,
    },
    secret,
  );
  const actual = Buffer.from(approval.signature);
  const expectedBytes = Buffer.from(expected);
  return (
    actual.length === expectedBytes.length &&
    crypto.timingSafeEqual(actual, expectedBytes)
  );
}

function encode(value: unknown): EncodedValue {
  if (value instanceof Uint8Array)
    return { bytes: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return { array: value.map(encode) };
  if (value && typeof value === "object")
    return {
      object: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          encode(item),
        ]),
      ),
    };
  return value as null | boolean | number | string;
}

function decode(value: EncodedValue): unknown {
  if (value && typeof value === "object") {
    if ("bytes" in value && typeof value.bytes === "string")
      return new Uint8Array(Buffer.from(value.bytes, "base64"));
    if ("array" in value) return value.array.map(decode);
    if ("object" in value)
      return Object.fromEntries(
        Object.entries(value.object).map(([key, item]) => [key, decode(item)]),
      );
    return undefined;
  }
  return value;
}

function stableJson(
  value: EncodedValue | Omit<StoredApproval, "signature">,
): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, EncodedValue>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
