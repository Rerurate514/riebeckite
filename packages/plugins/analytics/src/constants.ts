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
 * Stable substring appended to every built entry's HTML. Static builds render
 * content server-side only, so this marker makes the plugin verifiable in the
 * generated HTML without executing client JavaScript.
 */
export const ANALYTICS_MARKER = "RIEBECKITE_EXTERNAL_ANALYTICS_MARKER";
