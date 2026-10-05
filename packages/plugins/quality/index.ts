import {
  type Diagnostic,
  definePlugin,
  type PluginGeneratedHtml,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import { resolveQualityOptions } from "./src/options.js";
import {
  inspectHtml,
  QUALITY_PLUGIN_NAME,
  runInspection,
} from "./src/rules.js";
import type { InspectOptions, QualityOptions } from "./src/types.js";

export {
  inspectHtml,
  QUALITY_PLUGIN_NAME,
  RULE_CODES,
  type RuleCode,
} from "./src/rules.js";
export type {
  InspectOptions,
  QualityOptions,
  ResolvedInspectOptions,
  ResolvedQualityOptions,
} from "./src/types.js";

/**
 * Inspects a final, fully rendered SSG page. Each returned diagnostic carries
 * `filePath` set to `page.path` so integrations can attribute it to an emitted
 * file. Purely functional: the page object is not mutated.
 */
export function inspectGeneratedHtml(
  page: PluginGeneratedHtml,
  options: InspectOptions = {},
): Diagnostic[] {
  return inspectHtml(page.html, options).map((diagnostic) => ({
    ...diagnostic,
    filePath: page.path,
  }));
}

/**
 * Static quality and accessibility inspection for generated HTML.
 *
 * At the manifest stage the plugin inspects each public entry's rendered HTML
 * and pushes diagnostics into the shared array. The `inspectGeneratedHtml`
 * field lets an SSG integration inspect final pages after the build, where no
 * manifest is available.
 */
export function qualityPlugin(options: QualityOptions = {}): RiebeckitePlugin {
  const resolved = resolveQualityOptions(options);
  const inspectOptions: InspectOptions = {
    ignoreRules: options.ignoreRules,
    a11y: options.a11y,
  };

  return definePlugin({
    name: QUALITY_PLUGIN_NAME,
    options,
    onManifestCreated: ({ manifest, diagnostics }) => {
      if (!resolved.inspect.enabled) return;
      for (const entry of manifest.publicEntries) {
        for (const diagnostic of runInspection(entry.html, resolved.inspect)) {
          diagnostics.push({
            ...diagnostic,
            slug: entry.slug,
            filePath: entry.publicLocation?.permalink,
          });
        }
      }
    },
    inspectGeneratedHtml: (page) => inspectGeneratedHtml(page, inspectOptions),
    buildEnd: ({ manifest }) => {
      if (resolved.failOn !== "error") return;
      const errors = manifest.diagnostics.filter(
        (diagnostic) =>
          diagnostic.pluginName === QUALITY_PLUGIN_NAME &&
          diagnostic.severity === "error",
      );
      if (errors.length > 0) {
        const details = errors
          .map((diagnostic) => `- ${diagnostic.message}`)
          .join("\n");
        throw new Error(
          `Quality inspection failed with ${errors.length} error diagnostic(s):\n${details}`,
        );
      }
    },
  });
}

export const quality = qualityPlugin;
