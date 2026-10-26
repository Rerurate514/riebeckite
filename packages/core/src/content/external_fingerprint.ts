import crypto from "node:crypto";
import { stableStringify } from "../plugin/plugin_memo.js";
import type { JsonValue } from "../types/json_value.js";

export function fingerprintExternalValue(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value as JsonValue))
    .digest("hex");
}
