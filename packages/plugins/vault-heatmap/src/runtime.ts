import type {
  ContentManifest,
  ContentManifestEntry,
  DerivedViewRegistry,
  Diagnostic,
} from "@riebeckite/core";
import { dateKey, vaultActivityView } from "./activity.js";
import { parseVaultHeatmap } from "./parse.js";
import {
  createVaultHeatmapPlaceholderPattern,
  decodeVaultHeatmapSource,
  VAULT_HEATMAP_ATTRIBUTE,
} from "./placeholder.js";
import { renderVaultHeatmap, renderVaultHeatmapError } from "./render.js";
import type {
  VaultActivity,
  VaultHeatmapInput,
  VaultHeatmapOptions,
} from "./types.js";

type ResolvedVaultHeatmapOptions = Required<VaultHeatmapOptions>;

export function createVaultHeatmapRuntime(
  options: ResolvedVaultHeatmapOptions,
) {
  return {
    async resolve(
      manifest: ContentManifest,
      derived: DerivedViewRegistry,
      diagnostics: Diagnostic[],
    ): Promise<void> {
      const entries = manifest.entries.filter((entry) =>
        entry.html.includes(VAULT_HEATMAP_ATTRIBUTE),
      );
      if (entries.length === 0) return;

      let activity: VaultActivity;
      try {
        const fields = [
          ...new Set([...options.createdFields, ...options.modifiedFields]),
        ];
        const resolution = await derived.resolveWithDependencies(
          vaultActivityView,
          {
            fields: {
              created: options.createdFields,
              modified: options.modifiedFields,
            },
            entries: manifest.discoverableEntries.map((entry) =>
              activityInput(entry, fields),
            ),
          },
        );
        activity = resolution.value;
      } catch (error) {
        const message = `Vault heatmap activity could not be resolved (${formatError(error)}).`;
        replaceEverywhere(entries, (entry) => {
          report(entry.slug, message, diagnostics);
          return renderVaultHeatmapError(message);
        });
        return;
      }

      for (const entry of entries) {
        entry.html = entry.html.replace(
          createVaultHeatmapPlaceholderPattern(),
          (_match, encoded: string) =>
            resolveBlock(entry.slug, encoded, options, activity, diagnostics),
        );
      }
    },
  };
}

function activityInput(
  entry: ContentManifestEntry,
  fields: readonly string[],
): VaultHeatmapInput["entries"][number] {
  const dates: Record<string, string> = {};
  for (const field of fields) {
    const value = dateKey(entry.frontmatter[field]);
    if (value !== null) dates[field] = value;
  }
  return { slug: entry.slug, dates };
}

function resolveBlock(
  slug: string,
  encoded: string,
  options: ResolvedVaultHeatmapOptions,
  activity: VaultActivity,
  diagnostics: Diagnostic[],
): string {
  let source: string;
  try {
    source = decodeVaultHeatmapSource(encoded);
  } catch (error) {
    return fail(
      slug,
      `Vault heatmap block in \`${slug}\` could not be decoded (${formatError(error)}).`,
      diagnostics,
    );
  }

  const parsed = parseVaultHeatmap(source, {
    weeks: options.weeks,
    title: options.title,
    weekStart: options.weekStart,
  });
  if (parsed.ok === false) {
    return fail(
      slug,
      `Vault heatmap block in \`${slug}\` ${parsed.reason}`,
      diagnostics,
    );
  }

  return renderVaultHeatmap(parsed.spec, activity);
}

function replaceEverywhere(
  entries: readonly ContentManifestEntry[],
  replace: (entry: ContentManifestEntry) => string,
): void {
  for (const entry of entries) {
    entry.html = entry.html.replace(
      createVaultHeatmapPlaceholderPattern(),
      () => replace(entry),
    );
  }
}

function fail(
  slug: string,
  message: string,
  diagnostics: Diagnostic[],
): string {
  report(slug, message, diagnostics);
  return renderVaultHeatmapError(message);
}

function report(
  slug: string,
  message: string,
  diagnostics: Diagnostic[],
): void {
  diagnostics.push({
    code: "vault-heatmap-invalid",
    severity: "error",
    pluginName: "vault-heatmap",
    slug,
    message,
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
