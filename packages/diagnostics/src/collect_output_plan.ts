import {
  type buildOutputPlan,
  compareOutputPlan,
  type Diagnostic,
} from "@riebeckite/core";
import { createDiagnosticFingerprint } from "./fingerprint.js";
import type {
  DevelopmentDiagnostic,
  DevelopmentDiagnosticCategory,
} from "./model.js";

export function createDiagnosticFromError(
  category: DevelopmentDiagnosticCategory,
  code: string,
  message: string,
  _error: unknown,
): DevelopmentDiagnostic {
  return {
    fingerprint: createDiagnosticFingerprint({
      code,
      category,
      subject: { kind: subjectKindFor(category) },
      message,
    }),
    code,
    category,
    severity: "error",
    message,
    subject: { kind: subjectKindFor(category) },
  };
}

export function diagnoseOutputPlan(
  plan: ReturnType<typeof buildOutputPlan>,
  actualOutputPaths?: Iterable<string>,
): readonly DevelopmentDiagnostic[] {
  const diagnostics: DevelopmentDiagnostic[] = plan.conflicts.map(
    (conflict) => ({
      fingerprint: createDiagnosticFingerprint({
        code: "OUTPUT_OWNER_CONFLICT",
        category: "output",
        subject: { kind: "output", value: conflict.path },
        message: `Multiple owners declare ${conflict.path}.`,
      }),
      code: "OUTPUT_OWNER_CONFLICT",
      category: "output",
      severity: "error",
      message: `Multiple owners declare ${conflict.path}.`,
      subject: { kind: "output", value: conflict.path },
      details: conflict.owners.join(", "),
    }),
  );
  if (!actualOutputPaths) return diagnostics;
  const comparison = compareOutputPlan(plan, actualOutputPaths);
  diagnostics.push(
    ...comparison.missingInPlan.map((path) =>
      outputDiagnostic("OUTPUT_MISSING_IN_PLAN", "error", path),
    ),
  );
  diagnostics.push(
    ...comparison.missingInDist.map((path) =>
      outputDiagnostic("OUTPUT_MISSING_IN_DIST", "error", path),
    ),
  );
  diagnostics.push(
    ...comparison.unknown.map((path) =>
      outputDiagnostic("OUTPUT_UNKNOWN", "warning", path),
    ),
  );
  diagnostics.push(
    ...comparison.publicationViolations.map((path) =>
      outputDiagnostic("OUTPUT_PUBLICATION_VIOLATION", "error", path),
    ),
  );
  return diagnostics;
}

export function outputDiagnostic(
  code: string,
  severity: "error" | "warning",
  path: string,
): DevelopmentDiagnostic {
  return {
    fingerprint: createDiagnosticFingerprint({
      code,
      category: "output",
      subject: { kind: "output", value: path },
      message: `${path} violates the output plan.`,
    }),
    code,
    category: "output",
    severity,
    message: `${path} violates the output plan.`,
    subject: { kind: "output", value: path },
  };
}

export function fromCoreDiagnostic(
  diagnostic: Diagnostic,
): DevelopmentDiagnostic {
  return {
    fingerprint: createDiagnosticFingerprint({
      code: diagnostic.code.toUpperCase().replaceAll("-", "_"),
      category: "content",
      subject: { kind: "content", value: diagnostic.slug ?? diagnostic.target },
      location: diagnostic.filePath
        ? {
            file: diagnostic.filePath,
            line: diagnostic.line,
            column: diagnostic.column,
          }
        : undefined,
      plugin: diagnostic.pluginName,
      message: diagnostic.message,
    }),
    code: diagnostic.code.toUpperCase().replaceAll("-", "_"),
    category: "content",
    severity: diagnostic.severity,
    message: diagnostic.message,
    subject: { kind: "content", value: diagnostic.slug ?? diagnostic.target },
    location: diagnostic.filePath
      ? {
          file: diagnostic.filePath,
          line: diagnostic.line,
          column: diagnostic.column,
        }
      : undefined,
    plugin: diagnostic.pluginName,
    fix: diagnostic.suggestion
      ? { kind: "manual", description: diagnostic.suggestion }
      : undefined,
  };
}

export function skipped(
  category: DevelopmentDiagnosticCategory,
  code: string,
  message: string,
): DevelopmentDiagnostic {
  return {
    fingerprint: createDiagnosticFingerprint({
      code,
      category,
      subject: { kind: subjectKindFor(category) },
      message,
    }),
    code,
    category,
    severity: "info",
    status: "unavailable",
    message,
    subject: { kind: subjectKindFor(category) },
  };
}

export function compareDiagnostics(
  left: DevelopmentDiagnostic,
  right: DevelopmentDiagnostic,
): number {
  const leftKey = [
    left.category,
    left.code,
    left.location?.file ?? "",
    left.message,
    left.fingerprint,
  ].join("\0");
  const rightKey = [
    right.category,
    right.code,
    right.location?.file ?? "",
    right.message,
    right.fingerprint,
  ].join("\0");
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function subjectKindFor(category: DevelopmentDiagnosticCategory) {
  return category === "plugins" ? "plugin" : category;
}
