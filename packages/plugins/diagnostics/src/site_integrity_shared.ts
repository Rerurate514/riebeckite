import type { Diagnostic, DiagnosticSeverity } from "@riebeckite/core";
import {
  DEFAULT_SEVERITY,
  PLUGIN_NAME,
  type SiteIntegrityOptions,
} from "./site_integrity_types.js";

export function normalizeRoutePath(value: string): string {
  const path = `/${value.split(/[?#]/)[0]?.split("/").filter(Boolean).join("/") ?? ""}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

export function diagnostic(
  options: SiteIntegrityOptions,
  input: Omit<Diagnostic, "pluginName" | "severity"> & {
    severity?: DiagnosticSeverity;
  },
): Diagnostic {
  return {
    pluginName: PLUGIN_NAME,
    severity:
      options.severity?.[input.code] ??
      input.severity ??
      DEFAULT_SEVERITY[input.code] ??
      "warning",
    ...input,
  };
}
