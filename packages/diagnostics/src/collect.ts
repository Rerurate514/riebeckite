import {
  buildOutputPlan,
  type ContentManager,
  compareOutputPlan,
  type Diagnostic,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type {
  DevelopmentDiagnostic,
  DevelopmentDiagnosticCategory,
  DevelopmentDiagnosticReport,
  DevelopmentDiagnosticSeverity,
} from "./model.js";

type InspectableContent = Pick<
  ContentManager,
  "inspect" | "getOutputChangeSet"
>;

export type DevelopmentDiagnosticsInput = {
  readonly config: ResolvedRiebeckiteConfig;
  readonly content?: InspectableContent;
  readonly contentDiagnostics?: readonly Diagnostic[];
  readonly actualOutputPaths?: Iterable<string>;
  readonly revision?: number;
  readonly includeOutput?: boolean;
};

export async function collectDevelopmentDiagnostics(
  input: DevelopmentDiagnosticsInput,
): Promise<DevelopmentDiagnosticReport> {
  const diagnostics: DevelopmentDiagnostic[] = [
    ...environmentDiagnostics(),
    ...configurationDiagnostics(input.config),
    ...pluginDiagnostics(input.config),
    ...themeDiagnostics(input.config),
  ];
  if (input.contentDiagnostics) {
    diagnostics.push(...input.contentDiagnostics.map(fromCoreDiagnostic));
  } else if (input.content) {
    await collectContentDiagnostics(input.content, diagnostics);
    if (input.includeOutput !== false) {
      await collectOutputDiagnostics(
        input.content,
        input.actualOutputPaths,
        diagnostics,
      );
    }
  } else {
    diagnostics.push(
      skipped(
        "content",
        "CONTENT_UNAVAILABLE",
        "Content inspection is unavailable.",
      ),
    );
    if (input.includeOutput !== false) {
      diagnostics.push(
        skipped(
          "output",
          "OUTPUT_UNAVAILABLE",
          "Output inspection is unavailable.",
        ),
      );
    }
  }
  const ordered = sortDevelopmentDiagnostics(diagnostics);
  return {
    version: 1,
    revision: input.revision ?? 0,
    diagnostics: ordered,
    summary: summarizeDevelopmentDiagnostics(ordered),
  };
}

async function collectContentDiagnostics(
  content: InspectableContent,
  diagnostics: DevelopmentDiagnostic[],
): Promise<void> {
  try {
    const inspection = await content.inspect();
    diagnostics.push(...inspection.diagnostics.map(fromCoreDiagnostic));
  } catch (error) {
    diagnostics.push(
      createDiagnosticFromError(
        "content",
        "CONTENT_INSPECTION_FAILED",
        "Content inspection failed.",
        error,
      ),
    );
  }
}

async function collectOutputDiagnostics(
  content: InspectableContent,
  actualOutputPaths: Iterable<string> | undefined,
  diagnostics: DevelopmentDiagnostic[],
): Promise<void> {
  try {
    const changes = await content.getOutputChangeSet();
    const plan = buildOutputPlan({
      inventory: [...changes.affected, ...changes.unchanged],
      removed: changes.removed,
      affectedPaths: new Set(changes.affected.map((output) => output.path)),
      cacheAvailable: changes.unchanged.length > 0,
    });
    diagnostics.push(...diagnoseOutputPlan(plan, actualOutputPaths));
  } catch (error) {
    diagnostics.push(
      createDiagnosticFromError(
        "output",
        "OUTPUT_INSPECTION_FAILED",
        "Output inspection failed.",
        error,
      ),
    );
  }
}

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

export function sortDevelopmentDiagnostics(
  diagnostics: readonly DevelopmentDiagnostic[],
): readonly DevelopmentDiagnostic[] {
  const unique = new Map<string, DevelopmentDiagnostic>();
  for (const diagnostic of diagnostics) {
    const fingerprint =
      diagnostic.fingerprint ?? createDiagnosticFingerprint(diagnostic);
    const normalized = { ...diagnostic, fingerprint };
    unique.set(JSON.stringify(normalized), normalized);
  }
  return [...unique.values()].sort(compareDiagnostics);
}

export function createDiagnosticFingerprint(
  diagnostic: Pick<
    DevelopmentDiagnostic,
    "code" | "category" | "subject" | "location" | "plugin" | "message"
  >,
): string {
  const identity = [
    diagnostic.category,
    diagnostic.code,
    diagnostic.subject.kind,
    diagnostic.subject.value ?? "",
    diagnostic.plugin ?? "",
    diagnostic.location?.file ?? "",
    diagnostic.location?.line ?? "",
    diagnostic.location?.column ?? "",
  ];
  if (identity.every((value, index) => index < 2 || value === ""))
    identity.push(diagnostic.message);
  let hash = 2166136261;
  for (const character of identity.join("\0")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `rb-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function summarizeDevelopmentDiagnostics(
  diagnostics: readonly DevelopmentDiagnostic[],
): DevelopmentDiagnosticReport["summary"] {
  const byCategory: Partial<Record<DevelopmentDiagnosticCategory, number>> = {};
  const byCode: Record<string, number> = {};
  let errors = 0;
  let warnings = 0;
  let info = 0;
  let unavailable = 0;
  let skipped = 0;
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") errors += 1;
    if (diagnostic.severity === "warning") warnings += 1;
    if (diagnostic.severity === "info") info += 1;
    if (diagnostic.status === "unavailable") unavailable += 1;
    if (diagnostic.status === "skipped") skipped += 1;
    byCategory[diagnostic.category] =
      (byCategory[diagnostic.category] ?? 0) + 1;
    byCode[diagnostic.code] = (byCode[diagnostic.code] ?? 0) + 1;
  }
  return { errors, warnings, info, unavailable, skipped, byCategory, byCode };
}

export function filterDevelopmentDiagnostics(
  report: DevelopmentDiagnosticReport,
  options: {
    readonly codes?: readonly string[];
    readonly severities?: readonly DevelopmentDiagnosticSeverity[];
  },
): DevelopmentDiagnosticReport {
  const codes = options.codes?.length ? new Set(options.codes) : undefined;
  const severities = options.severities?.length
    ? new Set(options.severities)
    : undefined;
  const diagnostics = report.diagnostics.filter(
    (diagnostic) =>
      (!codes || codes.has(diagnostic.code)) &&
      (!severities || severities.has(diagnostic.severity)),
  );
  return {
    ...report,
    diagnostics,
    summary: summarizeDevelopmentDiagnostics(diagnostics),
  };
}

function environmentDiagnostics(): readonly DevelopmentDiagnostic[] {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  const supported = major === 20 ? minor >= 19 : major >= 22;
  if (supported) return [];
  return [
    {
      fingerprint: createDiagnosticFingerprint({
        code: "ENV_NODE_VERSION",
        category: "environment",
        subject: { kind: "environment", value: process.versions.node },
        message:
          "Node.js does not satisfy Riebeckite's supported version range.",
      }),
      code: "ENV_NODE_VERSION",
      category: "environment",
      severity: "error",
      message: "Node.js does not satisfy Riebeckite's supported version range.",
      subject: { kind: "environment", value: process.versions.node },
      fix: {
        kind: "manual",
        description: "Use Node.js ^20.19.0 or >=22.12.0.",
      },
    },
  ];
}

function configurationDiagnostics(
  config: ResolvedRiebeckiteConfig,
): readonly DevelopmentDiagnostic[] {
  return config.content.directory
    ? []
    : [
        {
          fingerprint: createDiagnosticFingerprint({
            code: "CONFIG_CONTENT_DIRECTORY",
            category: "configuration",
            subject: { kind: "configuration" },
            message: "Content directory is not resolved.",
          }),
          code: "CONFIG_CONTENT_DIRECTORY",
          category: "configuration",
          severity: "error",
          message: "Content directory is not resolved.",
          subject: { kind: "configuration" },
        },
      ];
}

function pluginDiagnostics(
  config: ResolvedRiebeckiteConfig,
): readonly DevelopmentDiagnostic[] {
  const names = new Set<string>();
  const diagnostics: DevelopmentDiagnostic[] = [];
  for (const plugin of config.plugins) {
    if (!plugin.name)
      diagnostics.push({
        fingerprint: createDiagnosticFingerprint({
          code: "PLUGIN_INVALID_DEFINITION",
          category: "plugins",
          subject: { kind: "plugin" },
          message: "A resolved plugin has no name.",
        }),
        code: "PLUGIN_INVALID_DEFINITION",
        category: "plugins",
        severity: "error",
        message: "A resolved plugin has no name.",
        subject: { kind: "plugin" },
      });
    if (names.has(plugin.name))
      diagnostics.push({
        fingerprint: createDiagnosticFingerprint({
          code: "PLUGIN_DUPLICATE_ID",
          category: "plugins",
          subject: { kind: "plugin", value: plugin.name },
          plugin: plugin.name,
          message: `Plugin ID "${plugin.name}" is declared more than once.`,
        }),
        code: "PLUGIN_DUPLICATE_ID",
        category: "plugins",
        severity: "error",
        message: `Plugin ID "${plugin.name}" is declared more than once.`,
        subject: { kind: "plugin", value: plugin.name },
        plugin: plugin.name,
      });
    names.add(plugin.name);
  }
  return diagnostics;
}

function themeDiagnostics(
  config: ResolvedRiebeckiteConfig,
): readonly DevelopmentDiagnostic[] {
  return config.theme.styles.every((style) => style.moduleSpecifier)
    ? []
    : [
        {
          fingerprint: createDiagnosticFingerprint({
            code: "THEME_INVALID_STYLE",
            category: "theme",
            subject: { kind: "theme" },
            message: "A resolved theme style has no module specifier.",
          }),
          code: "THEME_INVALID_STYLE",
          category: "theme",
          severity: "error",
          message: "A resolved theme style has no module specifier.",
          subject: { kind: "theme" },
        },
      ];
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

function outputDiagnostic(
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

function fromCoreDiagnostic(diagnostic: Diagnostic): DevelopmentDiagnostic {
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

function skipped(
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

function compareDiagnostics(
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

function subjectKindFor(category: DevelopmentDiagnosticCategory) {
  return category === "plugins" ? "plugin" : category;
}
