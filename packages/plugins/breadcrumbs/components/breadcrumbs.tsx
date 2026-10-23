import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import { buildBreadcrumbItems } from "../src/breadcrumbs.js";
import type { BreadcrumbItem } from "../src/types.js";

export type BreadcrumbsProps = {
  items?: readonly BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
  separator?: string;
};
const Breadcrumbs = (async ({
  items: explicitItems,
  ariaLabel = "Breadcrumb",
  className = "rb-breadcrumbs",
  separator = "/",
}: Readonly<BreadcrumbsProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const items =
    explicitItems ??
    (site && article?.entry
      ? buildBreadcrumbItems({
          manifest: site.manifest,
          entry: article.entry,
          config: site.config,
          homeLabel: site.config.site.title,
        })
      : undefined);
  if (!items) return html``;
  if (items.length === 0) return html``;
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
            {index < items.length - 1 ? (
              <span class={`${className}__separator`} aria-hidden="true">
                {separator}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}) satisfies PluginComponent<BreadcrumbsProps>;
export default Breadcrumbs;
