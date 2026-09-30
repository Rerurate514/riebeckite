import type { Diagnostic } from "@riebeckite/core";
import {
  supportsWebmentionCapability,
  type WebmentionProvider,
} from "./provider.js";
import type { ResolvedWebmentionOptions } from "./types.js";

export const WEBMENTION_PLUGIN_NAME = "webmention";

/** Structured health checks for the configured provider and rendering mode. */
export function buildWebmentionDiagnostics(
  provider: WebmentionProvider,
  options: ResolvedWebmentionOptions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (options.render && !supportsWebmentionCapability(provider, "query")) {
    diagnostics.push({
      code: "webmention-render-requires-query",
      severity: "warning",
      pluginName: WEBMENTION_PLUGIN_NAME,
      message:
        "The webmention provider cannot query, so stored mentions will not render near articles.",
      suggestion:
        'Use a provider that advertises the "query" capability or set render: false.',
    });
  }

  if (!supportsWebmentionCapability(provider, "store")) {
    diagnostics.push({
      code: "webmention-receive-requires-store",
      severity: "warning",
      pluginName: WEBMENTION_PLUGIN_NAME,
      message:
        "The webmention provider cannot store, so the receive endpoint rejects deliveries with 503.",
      suggestion:
        'Use a provider that advertises the "store" capability or disable the plugin.',
    });
  }

  return diagnostics;
}
