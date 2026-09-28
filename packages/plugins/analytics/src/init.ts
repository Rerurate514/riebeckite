import { ANALYTICS_SCRIPT_PATH } from "./constants.js";

const SCRIPT_ATTRIBUTE = "data-riebeckite-analytics";

/**
 * Injects the analytics bootstrap `<script>` into `document.head` exactly once.
 * The bootstrap endpoint then loads the configured provider script.
 *
 * This initializer is static: it always loads `ANALYTICS_SCRIPT_PATH`. It has
 * no SPA route awareness — see the README for the documented limitations.
 */
export function initAnalytics(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[${SCRIPT_ATTRIBUTE}]`)) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = ANALYTICS_SCRIPT_PATH;
  script.setAttribute(SCRIPT_ATTRIBUTE, "");
  document.head.appendChild(script);
}
