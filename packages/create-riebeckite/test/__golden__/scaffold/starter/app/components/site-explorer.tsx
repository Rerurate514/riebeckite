import {
  resolveSiteNavigation,
  SidebarNavigation,
} from "@riebeckite/plugin-navigation";
import { useSiteContext } from "@riebeckite/ui";

export function SiteExplorer() {
  const site = useSiteContext();
  const items = site
    ? (resolveSiteNavigation(site.config, site.manifest, site.language)
        ?.primary ?? [])
    : [];

  if (items.length === 0) return null;

  return (
    <SidebarNavigation
      items={items}
      path={site?.path}
      language={site?.language}
      label="File explorer"
      searchable
      nativeDetails
      stateKey="starter:explorer"
      class="site-explorer__navigation"
    />
  );
}
