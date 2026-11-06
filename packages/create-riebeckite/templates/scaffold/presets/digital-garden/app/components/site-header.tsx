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
          <span class="site-header__mark">
            <img
              src="/riebeckite-logo.png"
              alt=""
              class="site-header__logo"
              width="28"
              height="28"
            />
          </span>
          <span class="site-header__title">{site?.config.site.title}</span>
        </a>
        <nav class="site-header__navigation" aria-label="Primary navigation">
          <SiteNav placement="primary" omitHome />
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
        <div class="site-footer__identity">
          <a href="/" class="site-footer__note">
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
