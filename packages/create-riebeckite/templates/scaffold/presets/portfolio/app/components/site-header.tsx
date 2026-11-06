import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SiteNav } from "@riebeckite/plugin-navigation";
import { SearchBar } from "@riebeckite/plugin-search";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();

  return (
    <>
      <header class="site-header rb-site-header">
        <a href="/" class="site-header__home rb-site-header__home">
          {site?.config.site.title}
        </a>
        <nav class="site-header__navigation" aria-label="Primary navigation">
          <SiteNav
            class="site-header__nav"
            placement="primary"
            omitHome
          />
        </nav>
        <div class="site-header__actions">
          <SearchBar class="rr-search-bar--header" />
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
        <span class="site-footer__mark" aria-hidden="true" />
        <p class="site-footer__name">{site?.config.site.title}</p>
        <SiteNav placement="secondary" />
      </div>
    </footer>
  );
}
