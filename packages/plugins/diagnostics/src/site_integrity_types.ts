import type { DiagnosticCode, DiagnosticSeverity } from "@riebeckite/core";

export const PLUGIN_NAME = "diagnostics";

export const DEFAULT_SEVERITY: Record<string, DiagnosticSeverity> = {
  "content-integrity:broken-link": "warning",
  "content-integrity:unresolved-wikilink": "warning",
  "content-integrity:ambiguous-wikilink": "warning",
  "content-integrity:broken-asset": "warning",
  "content-integrity:duplicate-public-location": "error",
  "content-integrity:redirect-target-missing": "warning",
  "content-integrity:redirect-cycle": "error",
  "content-integrity:redirect-public-location-conflict": "error",
  "content-integrity:ambiguous-folder-page-owner": "warning",
};

export type SiteIntegrityOptions = {
  readonly severity?: Partial<Record<DiagnosticCode, DiagnosticSeverity>>;
};

export type RouteOwner = {
  readonly path: string;
  readonly slug: string;
  readonly kind: "content" | "redirect" | "page";
  readonly producer?: string;
};
