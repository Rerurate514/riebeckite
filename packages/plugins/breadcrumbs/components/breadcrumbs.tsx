import type { PluginComponent } from "@riebeckite/core";
import type { BreadcrumbItem } from "../src/types.js";

export type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
};
const Breadcrumbs = (({
  items,
  ariaLabel = "Breadcrumb",
  className = "rb-breadcrumbs",
}: Readonly<BreadcrumbsProps>) => {
  if (items.length === 0) return null;
  return (
    <nav class={className} data-breadcrumbs aria-label={ariaLabel}>
      <ol>
        {items.map((item, index) => (
          <li class={`${className}__item`} key={`${item.name}-${index}`}>
            {index === items.length - 1 ? (
              <span class={`${className}__current`} aria-current="page">
                {item.name}
              </span>
            ) : item.url ? (
              <a class={`${className}__link`} href={item.url}>
                {item.name}
              </a>
            ) : (
              <span class={`${className}__text`}>{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}) satisfies PluginComponent<BreadcrumbsProps>;
export default Breadcrumbs;
