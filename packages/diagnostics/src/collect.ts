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
} from "./model.js";

type InspectableContent = Pick<
  ContentManager,
  "inspect" | "getOutputChangeSet"
>;

export type DevelopmentDiagnosticsInput = {
  readonly config: ResolvedRiebeckiteConfig;
  readonly content?: InspectableContent;
  readonly actualOutputPaths?: Iterable<string>;
  readonly revision?: number;
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
  if (input.content) {
    await collectContentDiagnostics(input.content, diagnostics);
    await collectOutputDiagnostics(
      input.content,
      input.actualOutputPaths,
      diagnostics,
    );
  } else {
    diagnostics.push(
      skipped(
        "content",
        "CONTENT_UNAVAILABLE",
        "Content inspection is unavailable.",
      ),
    );
    diagnostics.push(
      skipped(
        "output",
        "OUTPUT_UNAVAILABLE",
        "Output inspection is unavailable.",
      ),
    );
  }
  const ordered = sortDevelopmentDiagnostics(diagnostics);
  return {
    version: 1,
    revision: input.revision ?? 0,
    diagnostics: ordered,
    summary: {
      errors: ordered.filter((item) => item.severity === "error").length,
      warnings: ordered.filter((item) => item.severity === "warning").length,
      info: ordered.filter((item) => item.severity === "info").length,
    },
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
    diagnostics.push(...outputDiagnostics(plan, actualOutputPaths));
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
    const key = JSON.stringify(diagnostic);
    unique.set(key, diagnostic);
  }
  return [...unique.values()].sort((left, right) =>
    [left.category, left.code, left.location?.file ?? "", left.message]
      .join("\0")
      .localeCompare(
        [
          right.category,
          right.code,
          right.location?.file ?? "",
          right.message,
        ].join("\0"),
      ),
  );
}

function environmentDiagnostics(): readonly DevelopmentDiagnostic[] {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  const supported = major === 20 ? minor >= 19 : major >= 22;
  if (supported) return [];
  return [
    {
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
        code: "PLUGIN_INVALID_DEFINITION",
        category: "plugins",
        severity: "error",
        message: "A resolved plugin has no name.",
        subject: { kind: "plugin" },
      });
    if (names.has(plugin.name))
      diagnostics.push({
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
          code: "THEME_INVALID_STYLE",
          category: "theme",
          severity: "error",
          message: "A resolved theme style has no module specifier.",
          subject: { kind: "theme" },
        },
      ];
}

function outputDiagnostics(
  plan: ReturnType<typeof buildOutputPlan>,
  actualOutputPaths: Iterable<string> | undefined,
): readonly DevelopmentDiagnostic[] {
  const diagnostics: DevelopmentDiagnostic[] = plan.conflicts.map(
    (conflict) => ({
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
    code,
    category: "output",
    severity,
    message: `${path} violates the output plan.`,
    subject: { kind: "output", value: path },
  };
}

function fromCoreDiagnostic(diagnostic: Diagnostic): DevelopmentDiagnostic {
  return {
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
    code,
    category,
    severity: "info",
    message,
    subject: { kind: subjectKindFor(category) },
  };
}

function subjectKindFor(category: DevelopmentDiagnosticCategory) {
  return category === "plugins" ? "plugin" : category;
}
