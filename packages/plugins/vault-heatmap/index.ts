import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { vaultActivityView } from "./src/activity.js";
import { remarkVaultHeatmap } from "./src/remark.js";
import { createVaultHeatmapRuntime } from "./src/runtime.js";
import type { VaultHeatmapOptions } from "./src/types.js";

export {
  dateKey,
  VAULT_HEATMAP_VIEW_ID,
  vaultActivityView,
} from "./src/activity.js";
export { parseVaultHeatmap } from "./src/parse.js";
export {
  createVaultHeatmapPlaceholder,
  createVaultHeatmapPlaceholderPattern,
  decodeVaultHeatmapSource,
  encodeVaultHeatmapSource,
  VAULT_HEATMAP_ATTRIBUTE,
} from "./src/placeholder.js";
export { remarkVaultHeatmap } from "./src/remark.js";
export {
  renderVaultHeatmap,
  renderVaultHeatmapError,
  VAULT_HEATMAP_CLASS,
} from "./src/render.js";
export type {
  VaultActivity,
  VaultActivityDay,
  VaultHeatmapInput,
  VaultHeatmapOptions,
  VaultHeatmapParseResult,
  VaultHeatmapSpec,
  VaultHeatmapWeekStart,
} from "./src/types.js";

export const VAULT_HEATMAP_PLUGIN_NAME = "vault-heatmap";

export function vaultHeatmap(options: VaultHeatmapOptions = {}) {
  const resolved = resolveVaultHeatmapOptions(options);
  const runtime = createVaultHeatmapRuntime(resolved);

  return definePlugin({
    name: VAULT_HEATMAP_PLUGIN_NAME,
    processedContentCache: {
      version: "vault-heatmap-v1",
      dependencyMode: "none",
    },
    options,
    derivedViews: [vaultActivityView],
    validateOptions: validateVaultHeatmapOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkVaultHeatmap, { language: resolved.language });
    },
    onManifestCreated: async (context) => {
      if (!context.derived) {
        throw new Error(
          "Vault heatmap requires a Derived View registry at manifest time.",
        );
      }
      await runtime.resolve(
        context.manifest,
        context.derived,
        context.diagnostics,
      );
    },
    assets: [
      createStyleAsset(
        VAULT_HEATMAP_PLUGIN_NAME,
        "@riebeckite/plugin-vault-heatmap/style.css",
      ),
    ],
  });
}

function resolveVaultHeatmapOptions({
  language = "vault-heatmap",
  weeks = 52,
  title = "Vault activity",
  weekStart = "sunday",
}: VaultHeatmapOptions): Required<VaultHeatmapOptions> {
  return { language, weeks, title, weekStart };
}

function validateVaultHeatmapOptions(
  options: VaultHeatmapOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (
    options.language !== undefined &&
    (typeof options.language !== "string" || !options.language.trim())
  ) {
    issues.push({
      path: "language",
      message: "must be a non-empty string",
    });
  }
  if (
    options.weeks !== undefined &&
    (!Number.isInteger(options.weeks) ||
      options.weeks < 1 ||
      options.weeks > 104)
  ) {
    issues.push({
      path: "weeks",
      message: "must be an integer between 1 and 104",
    });
  }
  if (
    options.title !== undefined &&
    (typeof options.title !== "string" || !options.title.trim())
  ) {
    issues.push({
      path: "title",
      message: "must be a non-empty string",
    });
  }
  if (
    options.weekStart !== undefined &&
    options.weekStart !== "sunday" &&
    options.weekStart !== "monday"
  ) {
    issues.push({
      path: "weekStart",
      message: 'must be "sunday" or "monday"',
    });
  }

  return issues;
}
