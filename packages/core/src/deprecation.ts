import type { Diagnostic } from "./types/diagnostic.js";

export type DeprecationKind =
  | "config"
  | "plugin-api"
  | "theme-api"
  | "cli"
  | "scaffold"
  | "package";

export type DeprecationNotice = {
  readonly kind: DeprecationKind;
  readonly id: string;
  readonly target: string;
  readonly deprecatedSince: string;
  readonly action: string;
  readonly replacement?: string;
  readonly documentationUrl?: string;
  readonly removedIn?: string;
};

export function createDeprecationDiagnostic(
  notice: DeprecationNotice,
): Diagnostic {
  return {
    code: `deprecated-${notice.kind}`,
    severity: "warning",
    message: formatDeprecationMessage(notice),
    target: notice.target,
    suggestion: notice.replacement
      ? `Use ${notice.replacement}. ${notice.action}`
      : notice.action,
    meta: { deprecation: notice },
  };
}

export function formatDeprecationMessage(notice: DeprecationNotice): string {
  const lines = [
    `Deprecated: ${notice.target}`,
    `Deprecated since: ${notice.deprecatedSince}`,
  ];
  if (notice.replacement) lines.push(`Use: ${notice.replacement}`);
  lines.push(`Migration: ${notice.action}`);
  if (notice.documentationUrl) lines.push(`See: ${notice.documentationUrl}`);
  if (notice.removedIn) lines.push(`Removal planned: ${notice.removedIn}`);
  return lines.join("\n");
}
