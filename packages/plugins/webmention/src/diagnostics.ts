import type { Diagnostic } from "@riebeckite/core";
import {
  supportsWebmentionCapability,
  type WebmentionProvider,
} from "./provider.js";

export const WEBMENTION_PLUGIN_NAME = "webmention";

/** Structured health checks for the configured provider. */
export function buildWebmentionDiagnostics(
  provider: WebmentionProvider,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!supportsWebmentionCapability(provider, "query")) {
    diagnostics.push({
      code: "webmention-query-unavailable",
      severity: "warning",
      pluginName: WEBMENTION_PLUGIN_NAME,
      message:
        "The webmention provider cannot query, so stored mentions are unavailable to the Site.",
      suggestion: 'Use a provider that advertises the "query" capability.',
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
