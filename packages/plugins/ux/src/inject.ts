import { escapeScriptJson } from "@riebeckite/core";
import {
  UX_CONFIG_ATTRIBUTE,
  UX_CONFIG_ELEMENT_ID,
  type UxResolvedConfig,
} from "./options.js";

/**
 * Serializes the resolved options into an inert JSON script element.
 *
 * Client initializers are static and receive no plugin options, so the build
 * injects this element into the article HTML and reads it back at runtime.
 * `escapeScriptJson` neutralizes `<`, `>`, `&`, U+2028 and U+2029 so labels
 * can never terminate the script element.
 */
export function renderUxConfigElement(config: UxResolvedConfig): string {
  const json = escapeScriptJson(JSON.stringify(config));
  return `<script type="application/json" id="${UX_CONFIG_ELEMENT_ID}" ${UX_CONFIG_ATTRIBUTE}>${json}</script>`;
}

/**
 * Prepends the configuration element exactly once.
 *
 * The attribute doubles as the idempotency marker, so repeated calls (for
 * example from both `onPostProcessed` and `onManifestCreated`) are no-ops.
 */
export function injectUxConfig(html: string, config: UxResolvedConfig): string {
  if (html.includes(UX_CONFIG_ATTRIBUTE)) return html;
  return `${renderUxConfigElement(config)}${html}`;
}
