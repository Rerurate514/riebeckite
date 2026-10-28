export type SpaOptions = {
  prefetch?: false | "hover";
  scrollRestoration?: boolean;
  viewTransitions?: boolean;
};

export type SpaPageCommit = (context: {
  root: HTMLElement;
  signal: AbortSignal;
}) => void | Promise<void>;

export type SpaNavigationEventDetail = {
  url: string;
  popstate: boolean;
};

export const SPA_NAVIGATION_EVENT = "spa:navigation";

export type SpaNavigationOptions = SpaOptions & {
  onBeforePageCommit?: (signal: AbortSignal) => void | Promise<void>;
  onPageCommit?: SpaPageCommit;
};

export function spa(options: SpaOptions = {}): Readonly<SpaOptions> {
  validateSpaOptions(options);
  return Object.freeze({ ...options });
}

export function validateSpaOptions(options: SpaOptions): void {
  if (
    options.prefetch !== undefined &&
    options.prefetch !== false &&
    options.prefetch !== "hover"
  ) {
    throw new TypeError('SPA prefetch must be false or "hover".');
  }
  if (
    options.scrollRestoration !== undefined &&
    typeof options.scrollRestoration !== "boolean"
  ) {
    throw new TypeError("SPA scrollRestoration must be a boolean.");
  }
  if (
    options.viewTransitions !== undefined &&
    typeof options.viewTransitions !== "boolean"
  ) {
    throw new TypeError("SPA viewTransitions must be a boolean.");
  }
}
