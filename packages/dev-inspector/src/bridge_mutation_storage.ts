import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ContentMutationPlan } from "@riebeckite/core";

export type StoredPlan = { readonly hash: string; readonly plan: EncodedValue };
export type StoredApproval = {
  readonly planId: string;
  readonly planHash: string;
  readonly expiresAt: number;
  readonly used: boolean;
  readonly signature: string;
};
export type EncodedValue =
  | null
  | boolean
  | number
  | string
  | { readonly bytes: string }
  | { readonly array: readonly EncodedValue[] }
  | { readonly object: Readonly<Record<string, EncodedValue>> };

export function rejected(planId: string, code: string) {
  return { planId, applied: false, conflicts: [{ code }] };
}

export function planPath(root: string, id: string): string {
  return path.join(
    root,
    ".riebeckite",
    "bridge",
    "plans",
    `${safeId(id)}.json`,
  );
}

export function approvalPath(root: string, id: string): string {
  return path.join(
    root,
    ".riebeckite",
    "bridge",
    "approvals",
    `${safeId(id)}.json`,
  );
}

export function safeId(value: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("Invalid mutation ID.");
  return value;
}

export async function readPlan(
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

export async function readApproval(
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

export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(temporary, file);
}

export async function claimApproval(
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

export function hashPlan(plan: ContentMutationPlan): string {
  return crypto
    .createHash("sha256")
    .update(stableJson(encode(plan)))
    .digest("hex");
}

export function sign(
  value: Omit<StoredApproval, "signature">,
  secret: string,
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(stableJson(value))
    .digest("hex");
}

export function validSignature(
  approval: StoredApproval,
  secret: string,
): boolean {
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

export function encode(value: unknown): EncodedValue {
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

export function decode(value: EncodedValue): unknown {
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

export function stableJson(
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
