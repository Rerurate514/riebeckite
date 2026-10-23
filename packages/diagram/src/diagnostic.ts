export function reportDiagramDiagnostic(
  file: unknown,
  input: { source: string; ruleId: string; message: string },
): void {
  const reporter = (
    file as { message?: (reason: string) => unknown } | undefined
  )?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, input.message);
  if (diagnostic && typeof diagnostic === "object")
    Object.assign(diagnostic, { source: input.source, ruleId: input.ruleId });
}
