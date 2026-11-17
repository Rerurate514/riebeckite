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
        <div class="site-header__inner">
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
          <SiteNav
            placement="primary"
            omitHome
            label="Primary navigation"
            class="site-header__nav"
          />
          <div class="site-header__actions">
            <SearchBar class="rr-search-bar--header site-header__search" />
            <ColorModeToggle />
            <DrawerTrigger
              controls="site-navigation"
              label="Menu"
              icon="menu"
              class="site-header__menu"
            />
          </div>
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
        <a href="/" class="site-footer__home">
          {site?.config.site.title}
        </a>
        <p class="site-footer__meta">
          Built with <a href="https://riebeckite.dev">Riebeckite</a>
        </p>
      </div>
    </footer>
  );
}
