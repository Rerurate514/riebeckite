import {
  API_LIFECYCLE_DIAGNOSTIC_CODE,
  API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE,
  type ApiLifecycleDefinition,
  getApiLifecycleConfigSource,
  hasApiLifecycleConfigPath,
  type ResolvedRiebeckiteConfig,
  resolveApiLifecycle,
} from "@riebeckite/core";
import { createDiagnosticFingerprint } from "./fingerprint.js";
import type { DevelopmentDiagnostic } from "./model.js";

export function collectApiLifecycleDiagnostics(
  config: ResolvedRiebeckiteConfig,
  additional: readonly ApiLifecycleDefinition[] = [],
): readonly DevelopmentDiagnostic[] {
  const registry = resolveApiLifecycle(config, additional);
  const diagnostics: DevelopmentDiagnostic[] = registry.issues.map((issue) => {
    const apiId = issue.apiId ?? "api-lifecycle";
    return {
      fingerprint: createDiagnosticFingerprint({
        code: API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE,
        category: "api",
        subject: { kind: "api", value: `${apiId}:${issue.code}` },
        message: issue.message,
      }),
      code: API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE,
      category: "api",
      severity: "error",
      message: `Invalid API lifecycle metadata for ${apiId}.`,
      subject: { kind: "api", value: apiId },
      details: issue.message,
      fix: {
        kind: "manual",
        description:
          "Correct the lifecycle definition or remove it from the registry.",
      },
    };
  });

  const configSource = getApiLifecycleConfigSource(config);
  for (const entry of registry.deprecated()) {
    const usage = detectUsage(config, configSource, entry);
    if (!usage) continue;
    diagnostics.push(deprecatedApiDiagnostic(entry, usage));
  }

  return diagnostics;
}

function detectUsage(
  config: ResolvedRiebeckiteConfig,
  configSource: unknown,
  entry: ApiLifecycleDefinition,
): string | undefined {
  if (entry.pluginOption) {
    const plugin = config.plugins.find(
      (candidate) => candidate.name === entry.pluginOption?.plugin,
    );
    const options = plugin?.options;
    if (
      typeof options === "object" &&
      options !== null &&
      Object.hasOwn(options, entry.pluginOption.option)
    ) {
      return `plugin option "${entry.pluginOption.option}" on "${entry.pluginOption.plugin}"`;
    }
  }
  if (
    entry.configPath &&
    hasApiLifecycleConfigPath(configSource, entry.configPath)
  ) {
    return `configuration key "${entry.configPath}"`;
  }
  return undefined;
}

function deprecatedApiDiagnostic(
  entry: ApiLifecycleDefinition,
  usage: string,
): DevelopmentDiagnostic {
  const code = entry.diagnosticCode ?? API_LIFECYCLE_DIAGNOSTIC_CODE;
  const packageName = entry.package ?? entry.id.slice(0, entry.id.indexOf("#"));
  return {
    fingerprint: createDiagnosticFingerprint({
      code,
      category: "api",
      subject: { kind: "api", value: entry.id },
      plugin: entry.pluginOption?.plugin,
      message: `Deprecated API "${entry.id}" is used by ${usage}.`,
    }),
    code,
    category: "api",
    severity: "warning",
    message: `Deprecated API "${entry.id}" is used by ${usage}.`,
    subject: { kind: "api", value: entry.id },
    plugin: entry.pluginOption?.plugin,
    cause: entry.reason,
    details: [
      `Kind: ${entry.kind}`,
      `Package: ${packageName}`,
      `Deprecated since: ${entry.deprecatedSince}`,
      `Replacement: ${entry.replacement ?? "none"}`,
      `Removal: ${entry.removalVersion ?? "not confirmed"}`,
      `Migration guide: ${entry.migrationGuide ?? "none"}`,
      `Detected in: ${usage}`,
    ].join("\n"),
    fix: {
      kind: "manual",
      description: entry.replacement
        ? `Use ${entry.replacement} instead of ${entry.id}.`
        : `Follow the migration guide for ${entry.id}.`,
    },
  };
}
