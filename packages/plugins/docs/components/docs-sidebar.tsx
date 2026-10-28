import type { PluginComponent } from "@riebeckite/core";
import {
  type NavigationItem,
  SidebarNavigation,
} from "@riebeckite/plugin-navigation";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import { getDocsNavigation } from "../src/data.js";
import type { DocsNavigationItem, DocsOptions } from "../src/types.js";

export type DocsSidebarProps = {
  readonly items?: readonly DocsNavigationItem[];
  readonly currentPermalink?: string;
  readonly label?: string;
  readonly placement?: "inline" | "article-rail";
};

const DocsSidebar = (async (props: Readonly<DocsSidebarProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const options = findDocsOptions(site?.config.plugins);
  const items =
    props.items ??
    (site && article?.entry && options
      ? await getDocsNavigation({
          view: site.view,
          entries: site.manifest.discoverableEntries,
          entrySlug: article.entry.slug,
          options,
        })
      : []);
  if (items.length === 0) return html``;
  const label = props.label ?? options?.sidebar?.label ?? "Docs navigation";
  const sidebar = (
    <SidebarNavigation
      items={toNavigationItems(items)}
      path={props.currentPermalink ?? article?.entry?.permalink}
      label={label}
      searchable
      nativeDetails
      autoExpandActive
      stateKey={
        options ? `docs:${options.root}:${site?.language ?? ""}` : undefined
      }
      class="rb-docs-sidebar"
    />
  );
  return props.placement === "article-rail" ? (
    <aside class="rb-docs-sidebar-rail">{sidebar}</aside>
  ) : (
    sidebar
  );
}) satisfies PluginComponent<DocsSidebarProps>;

function toNavigationItems(
  items: readonly DocsNavigationItem[],
): readonly NavigationItem[] {
  return items.map((item) => ({
    label: item.title,
    ...(item.href ? { href: item.href } : {}),
    ...(item.collapsed === undefined ? {} : { collapsed: item.collapsed }),
    children: toNavigationItems(item.children),
  }));
}

export default DocsSidebar;

function findDocsOptions(
  plugins: readonly { name: string; options?: unknown }[] | undefined,
): DocsOptions | undefined {
  return plugins?.find((plugin) => plugin.name.startsWith("docs:"))?.options as
    | DocsOptions
    | undefined;
}
