export type DevelopmentDiagnosticSeverity = "error" | "warning" | "info";

export type DevelopmentDiagnosticCategory =
  | "configuration"
  | "plugins"
  | "content"
  | "output"
  | "theme"
  | "environment";

export type DevelopmentDiagnosticStatus =
  | "pass"
  | "warning"
  | "error"
  | "skipped";

export type DevelopmentDiagnosticLocation = {
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
};

export type DevelopmentDiagnosticSubject = {
  readonly kind:
    | "project"
    | "configuration"
    | "plugin"
    | "content"
    | "output"
    | "theme"
    | "environment";
  readonly value?: string;
};

export type DevelopmentDiagnosticFix = {
  readonly kind: "safe" | "review" | "manual";
  readonly description: string;
};

export type DevelopmentDiagnostic = {
  readonly code: string;
  readonly category: DevelopmentDiagnosticCategory;
  readonly severity: DevelopmentDiagnosticSeverity;
  readonly message: string;
  readonly subject: DevelopmentDiagnosticSubject;
  readonly location?: DevelopmentDiagnosticLocation;
  readonly plugin?: string;
  readonly cause?: string;
  readonly details?: string;
  readonly fix?: DevelopmentDiagnosticFix;
  readonly related?: readonly DevelopmentDiagnosticLocation[];
};

export type DevelopmentDiagnosticSummary = {
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
};

export type DevelopmentDiagnosticReport = {
  readonly version: 1;
  readonly revision: number;
  readonly diagnostics: readonly DevelopmentDiagnostic[];
  readonly summary: DevelopmentDiagnosticSummary;
};
