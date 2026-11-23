export type VFileDiagnostic = {
  message: string;
  source?: string;
  ruleId?: string;
  position?: unknown;
};

export function reportVFileDiagnostic(
  file: unknown,
  input: VFileDiagnostic,
): void {
  if (!isVFileLike(file)) return;
  const diagnostic = file.message(input.message, input.position);
  if (!diagnostic || typeof diagnostic !== "object") return;
  Object.assign(diagnostic, { source: input.source, ruleId: input.ruleId });
}

function isVFileLike(value: unknown): value is {
  message: (reason: string, position?: unknown) => unknown;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "function"
  );
}
