import {
  buildOutputPlan,
  type ContentManager,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  createDiagnosticFromError,
  diagnoseOutputPlan,
  fromCoreDiagnostic,
} from "./collect_output_plan.js";
import { createDiagnosticFingerprint } from "./fingerprint.js";
import type { DevelopmentDiagnostic } from "./model.js";

type InspectableContent = Pick<
  ContentManager,
  "inspect" | "getOutputChangeSet"
>;

export async function collectContentDiagnostics(
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

export async function collectOutputDiagnostics(
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

export function environmentDiagnostics(): readonly DevelopmentDiagnostic[] {
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

export function configurationDiagnostics(
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

export function pluginDiagnostics(
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

export function themeDiagnostics(
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
