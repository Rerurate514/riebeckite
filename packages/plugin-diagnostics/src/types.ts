import type { Diagnostic, DiagnosticCode, DiagnosticSeverity } from "@riebeckite/core";

export type DiagnosticsOptions = {
  failOnError?: boolean;
  reportUnusedAssets?: boolean;
  reportOrphans?: boolean;
  requiredFrontmatter?: string[];
  severity?: Partial<Record<DiagnosticCode, DiagnosticSeverity>>;
  exclude?: string[];
  publishStrategy?: "explicit" | "selective";
};

export type DiagnosticsSummary = {
  total: number;
  error: number;
  warning: number;
  info: number;
};

export type DiagnosticsReport = {
  diagnostics: Diagnostic[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
  infos: Diagnostic[];
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: DiagnosticsSummary;
  byCode: Map<DiagnosticCode, Diagnostic[]>;
};

export type AnalyzerContentConfig = {
  directory: string;
  exclude: string[];
  publishStrategy: "explicit" | "selective";
};