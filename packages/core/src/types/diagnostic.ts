export type DiagnosticSeverity = "info" | "warning" | "error";

export type DiagnosticCode =
  | "broken-wikilink"
  | "broken-image"
  | "broken-link"
  | "unused-asset"
  | "orphan-note"
  | "missing-frontmatter"
  | "publish-conflict"
  | "duplicate-title"
  | "slug-collision"
  | "excluded-public"
  | "internal-error"
  | (string & {});

export type Diagnostic = {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  pluginName?: string;
  filePath?: string;
  slug?: string;
  line?: number;
  column?: number;
  target?: string;
  suggestion?: string;
  meta?: Record<string, unknown>;
};