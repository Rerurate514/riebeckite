import { fingerprintExternalValue } from "../content/external_fingerprint.js";
import type { DerivedViewRegistry } from "../derived/derived_view.js";
import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";

export function assertUniqueDerivedViewIds(
  plugins: readonly RiebeckitePlugin[],
): void {
  const owners = new Map<string, string>();
  for (const plugin of plugins) {
    for (const view of plugin.derivedViews ?? []) {
      const previous = owners.get(view.id);
      if (previous) {
        throw new Error(
          `Derived View "${view.id}" is declared by both "${previous}" and "${plugin.name}".`,
        );
      }
      owners.set(view.id, plugin.name);
    }
  }
}

export function freezeGeneratedOutputPlanContext(context: {
  manifest: {
    discoverableEntries: readonly ContentManifestEntry[];
    routableEntries: readonly ContentManifestEntry[];
  };
  site: ResolvedRiebeckiteConfig["site"] | undefined;
  theme: ResolvedRiebeckiteConfig["theme"] | undefined;
  derived: DerivedViewRegistry;
}) {
  return {
    ...deepFreeze(
      structuredClone({
        manifest: context.manifest,
        site: context.site,
        theme: context.theme,
      }),
    ),
    derived: context.derived,
  };
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const property of Object.values(value)) deepFreeze(property);
  return value;
}

export function normalizeDerivedPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function fingerprintDerivedValue(value: unknown): string {
  return fingerprintExternalValue(normalizeDerivedValue(value));
}

export function normalizeDerivedValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizeDerivedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        normalizeDerivedValue(child),
      ]),
    );
  }
  return value;
}

export function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}
