export function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string" && isOutputPath(value);
}

export function isSha256(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function isFingerprint(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^(?:sha256:[a-f0-9]{64}(?::[^\r\n]+)?|hash:[^\r\n]+|etag:[^\r\n]+)$/.test(
      value,
    )
  );
}

export function isStringArray(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

export function isOutputPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/")
  ) {
    return false;
  }
  return value
    .split("/")
    .every((segment) => segment !== "." && segment !== "..");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
