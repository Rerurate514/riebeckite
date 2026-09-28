import {
  createStyleAsset,
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";
import { RICH_EMBED_PROVIDERS } from "./src/providers.js";
import { rehypeRichEmbed } from "./src/rehype.js";
import type { RichEmbedOptions, RichEmbedProvider } from "./src/types.js";

export type { RichEmbedOptions, RichEmbedProvider } from "./src/types.js";

export function richEmbed(options: RichEmbedOptions = {}) {
  return definePlugin({
    name: "rich-embed",
    options,
    validateOptions: validateRichEmbedOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeRichEmbed, options);
    },
    assets: [createStyleAsset("rich-embed")],
  });
}

export const richEmbedPlugin = richEmbed;

function validateRichEmbedOptions(
  options: RichEmbedOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (options.allowHosts !== undefined) {
    if (!Array.isArray(options.allowHosts)) {
      issues.push({
        path: "allowHosts",
        message: "Expected an array of hostnames.",
      });
    } else {
      for (const [index, host] of options.allowHosts.entries()) {
        if (typeof host !== "string" || host.trim().length === 0) {
          issues.push({
            path: `allowHosts[${index}]`,
            message: "Expected a non-empty hostname string.",
          });
        } else if (host.includes("/") || host.includes(":")) {
          issues.push({
            path: `allowHosts[${index}]`,
            message: "Expected a hostname only (no scheme, path, or port).",
          });
        }
      }
    }
  }

  for (const key of ["providers", "disable"] as const) {
    const value = options[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      issues.push({
        path: key,
        message: "Expected an array of provider names.",
      });
      continue;
    }
    for (const [index, provider] of value.entries()) {
      if (!isRichEmbedProvider(provider)) {
        issues.push({
          path: `${key}[${index}]`,
          message: `Unknown provider "${String(provider)}".`,
        });
      }
    }
  }

  return issues;
}

function isRichEmbedProvider(value: unknown): value is RichEmbedProvider {
  return (
    typeof value === "string" &&
    (RICH_EMBED_PROVIDERS as readonly string[]).includes(value)
  );
}
