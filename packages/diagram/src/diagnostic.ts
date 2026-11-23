import { reportVFileDiagnostic } from "@riebeckite/core";

export function reportDiagramDiagnostic(
  file: unknown,
  input: { source: string; ruleId: string; message: string },
): void {
  reportVFileDiagnostic(file, input);
}
