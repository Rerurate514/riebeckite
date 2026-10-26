import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  buildGlossary,
  renderGlossaryPage,
  resolveGlossaryOptions,
} from "./src/glossary.js";
import type { GlossaryOptions } from "./src/types.js";

export {
  buildGlossary,
  DEFAULT_GLOSSARY_BASE_PATH,
  DEFAULT_GLOSSARY_CLASS_NAME,
  DEFAULT_GLOSSARY_KEY,
  renderGlossaryPage,
  resolveGlossaryOptions,
} from "./src/glossary.js";
export type {
  GlossaryEntry,
  GlossaryOptions,
  ResolvedGlossaryOptions,
} from "./src/types.js";

export const GLOSSARY_PLUGIN_NAME = "glossary";

export function glossary(options: GlossaryOptions = {}) {
  const resolved = resolveGlossaryOptions(options);
  return definePlugin({
    name: GLOSSARY_PLUGIN_NAME,
    options,
    assets: [
      createStyleAsset("glossary", "@riebeckite/plugin-glossary/style.css"),
    ],
    validateOptions: validateGlossaryOptions,
    pageTypes: [
      {
        id: "glossary",
        paths: ({ manifest }) =>
          resolved.basePath === "" ||
          buildGlossary(manifest.discoverableEntries, resolved).length === 0
            ? []
            : [resolved.basePath],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          if (pathname !== resolved.basePath || resolved.basePath === "")
            return null;
          const entries = buildGlossary(manifest.discoverableEntries, resolved);
          if (entries.length === 0) return null;
          const page = renderGlossaryPage(entries, resolved);
          return {
            type: "glossary",
            pathname,
            title: page.title,
            body: page.html,
          };
        },
      },
    ],
  });
}

function validateGlossaryOptions(
  options: GlossaryOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  for (const key of [
    "basePath",
    "className",
    "key",
    "termKey",
    "definitionKey",
    "title",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  return issues;
}
