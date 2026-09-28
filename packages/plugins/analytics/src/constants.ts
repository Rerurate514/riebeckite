/**
 * Default path of the analytics bootstrap endpoint and of the `<script>` tag
 * the client entry injects.
 *
 * Client entries are static — they receive no plugin options — so the built-in
 * `initAnalytics` always loads this exact path. Overriding `scriptPath` mounts
 * the endpoint elsewhere and requires a custom client entry; the default is
 * kept here so both sides share one compile-time constant.
 */
export const ANALYTICS_SCRIPT_PATH = "/_analytics.js";

/**
 * `data-*` attribute that marks the analytics `<script>` tag.
 *
 * The server-side injection (`onManifestCreated`) and the browser initializer
 * (`initAnalytics`) both carry this attribute, so a built page can be verified
 * from its real output and the initializer stays idempotent.
 */
export const ANALYTICS_SCRIPT_ATTRIBUTE = "data-riebeckite-analytics";
