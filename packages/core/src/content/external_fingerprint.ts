import crypto from "node:crypto";
import { stableStringify } from "../plugin/plugin_memo.js";
import { toJsonValue } from "../types/json_value.js";

export function fingerprintExternalValue(value: unknown): string {
  const json = toJsonValue(value);
  if (json === undefined) {
    throw new TypeError(
      "External fingerprint values must be JSON serializable.",
    );
  }
  return crypto
    .createHash("sha256")
    .update(stableStringify(json))
    .digest("hex");
}
