import type {
  BreadcrumbsOptions,
  ResolvedBreadcrumbsOptions,
} from "./types.js";

export function resolveBreadcrumbsOptions(
  options: BreadcrumbsOptions | undefined,
): ResolvedBreadcrumbsOptions {
  return {
    homeLabel: options?.homeLabel?.trim() || "",
    className: options?.className?.trim() || "rb-breadcrumbs",
    ariaLabel: options?.ariaLabel?.trim() || "Breadcrumbs",
    separator: options?.separator ?? "/",
    jsonLd: options?.jsonLd ?? true,
  };
}
