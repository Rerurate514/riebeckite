/**
 * Public option and configuration types for the UX plugin.
 *
 * This module is imported by both the build-time plugin and the browser
 * initializer, so it must stay free of Node-only and Riebeckite-only imports.
 */

export type UxOptions = {
  /** Show a fixed reading-progress bar for the article. Defaults to `true`. */
  progress?: boolean;
  /** Show a back-to-top button after scrolling. Defaults to `true`. */
  backToTop?: boolean;
  /** Highlight the active entry in the article table of contents. Defaults to `true`. */
  tocScrollSpy?: boolean;
  /** Accessible label for the back-to-top button. */
  backToTopLabel?: string;
};

/** Options after defaults have been applied. Serialized into the page. */
export type UxResolvedConfig = {
  progress: boolean;
  backToTop: boolean;
  tocScrollSpy: boolean;
  backToTopLabel: string;
};

/** Id of the JSON configuration element injected into each article. */
export const UX_CONFIG_ELEMENT_ID = "rb-ux-config";

/** Attribute used both to stamp the config element and to detect it. */
export const UX_CONFIG_ATTRIBUTE = "data-rb-ux-config";

/** Defaults used when an option is omitted or the config element is absent. */
export const DEFAULT_UX_CONFIG: UxResolvedConfig = {
  progress: true,
  backToTop: true,
  tocScrollSpy: true,
  backToTopLabel: "Back to top",
};

/** Applies defaults to the user-provided options. */
export function resolveUxConfig(options: UxOptions = {}): UxResolvedConfig {
  return {
    progress: options.progress ?? DEFAULT_UX_CONFIG.progress,
    backToTop: options.backToTop ?? DEFAULT_UX_CONFIG.backToTop,
    tocScrollSpy: options.tocScrollSpy ?? DEFAULT_UX_CONFIG.tocScrollSpy,
    backToTopLabel: normalizeLabel(
      options.backToTopLabel,
      DEFAULT_UX_CONFIG.backToTopLabel,
    ),
  };
}

function normalizeLabel(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}
