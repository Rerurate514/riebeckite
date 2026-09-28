/**
 * Options shared by the pure inspection helpers and the plugin factory.
 */
export type InspectOptions = {
  /**
   * Diagnostic codes to suppress. Matching is exact, so pass values such as
   * `"quality:img-alt-missing"`.
   */
  ignoreRules?: readonly string[];
  /**
   * Accessibility inspection settings. When `enabled` is `false` every rule is
   * skipped and no diagnostics are produced.
   */
  a11y?: { enabled?: boolean };
};

/**
 * Options for {@link qualityPlugin}. Extends the inspection options with a
 * build-failure policy.
 */
export type QualityOptions = InspectOptions & {
  /**
   * `"error"` fails the build when the plugin produced an error-severity
   * diagnostic during the manifest stage. Defaults to `"never"`.
   */
  failOn?: "error" | "never";
};

/**
 * Normalized inspection options. Internal to the plugin implementation.
 */
export type ResolvedInspectOptions = {
  enabled: boolean;
  ignoreRules: ReadonlySet<string>;
};

/**
 * Normalized plugin options. Internal to the plugin implementation.
 */
export type ResolvedQualityOptions = {
  inspect: ResolvedInspectOptions;
  failOn: "error" | "never";
};
