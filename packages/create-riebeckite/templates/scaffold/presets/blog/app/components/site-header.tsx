import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import {
  resolveSiteNavigation,
  SidebarNavigation,
  SiteNav,
} from "@riebeckite/plugin-navigation";
import { SearchBar } from "@riebeckite/plugin-search";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();
  const navigation = site
    ? resolveSiteNavigation(site.config, site.manifest)
    : null;
  const explorerItems = (navigation?.primary ?? []).filter(
    (item) => item.href !== "/",
  );

  return (
    <>
      <header class="site-header rb-site-header">
        <a href="/" class="site-header__home rb-site-header__home">
          <img
            src="/riebeckite-logo.png"
            alt=""
            class="site-header__logo"
            width="32"
            height="32"
          />
          <span class="site-header__title">{site?.config.site.title}</span>
        </a>
        <SearchBar class="rr-search-bar--header site-header__search" />
        <SidebarNavigation
          class="site-header__explorer"
          items={explorerItems}
          label="Site explorer"
          collapsible
          autoExpandActive
        />
        <div class="site-header__actions">
          <ColorModeToggle />
          <DrawerTrigger
            controls="site-navigation"
            label="Menu"
            icon="menu"
            class="site-header__menu"
          />
        </div>
      </header>
      <Drawer id="site-navigation" label="Navigation">
        <SiteNav placement="primary" omitHome />
        <SiteNav placement="secondary" label="Secondary navigation" />
      </Drawer>
    </>
  );
}

export function SiteFooter() {
  const site = useSiteContext();

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__home">
            {site?.config.site.title}
          </a>
          <p class="site-footer__meta">
            Built with <a href="https://riebeckite.dev">Riebeckite</a>
          </p>
        </div>
        <SiteNav placement="secondary" />
      </div>
    </footer>
  );
}
