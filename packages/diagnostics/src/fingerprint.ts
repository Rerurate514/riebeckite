import type { DevelopmentDiagnostic } from "./model.js";

export function createDiagnosticFingerprint(
  diagnostic: Pick<
    DevelopmentDiagnostic,
    "code" | "category" | "subject" | "location" | "plugin" | "message"
  >,
): string {
  const identity = [
    diagnostic.category,
    diagnostic.code,
    diagnostic.subject.kind,
    diagnostic.subject.value ?? "",
    diagnostic.plugin ?? "",
    diagnostic.location?.file ?? "",
    diagnostic.location?.line ?? "",
    diagnostic.location?.column ?? "",
  ];
  if (identity.every((value, index) => index < 2 || value === ""))
    identity.push(diagnostic.message);
  let hash = 2166136261;
  for (const character of identity.join("\0")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `rb-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
