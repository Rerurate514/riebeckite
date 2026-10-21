import type { DiagnosticSeverity } from "@riebeckite/core";

export type PreviewDiagnostic = {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly pluginId?: string;
};
