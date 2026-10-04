/** One crumb in the generated breadcrumb trail. */
export type BreadcrumbItem = {
  name: string;
  url?: string;
};

export type BreadcrumbsOptions = {
  /**
   * Label for the site-wide home crumb. When omitted, the site title from the
   * resolved config (`site.title`) is used.
   */
  homeLabel?: string;
  /** Class name applied to the nav and its child elements. */
  className?: string;
  /** Accessible name for the navigation landmark. */
  ariaLabel?: string;
  /** Text placed between siblings (defaults to "/"). */
  separator?: string;
  /**
   * Emit a hierarchical BreadcrumbList JSON-LD script (defaults to `true`).
   */
  jsonLd?: boolean;
};

export type ResolvedBreadcrumbsOptions = {
  homeLabel: string;
  className: string;
  ariaLabel: string;
  separator: string;
  jsonLd: boolean;
};
