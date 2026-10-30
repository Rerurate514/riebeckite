import { SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import {
  Drawer,
  DrawerTrigger,
} from "@riebeckite/ui/drawer";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();

  return (
    <>
      <ColorModeToggle placement="floating" />
      <header class="site-header rb-site-header">
        <a href="/" class="site-header__home rb-site-header__home">
            <img
              src="/riebeckite-logo.png"
              alt=""
              class="site-header__logo"
              width="28"
              height="28"
            />
            {site?.config.site.title}
        </a>
        <nav class="site-header__navigation" aria-label="Primary navigation">
          <SiteNav placement="primary" omitHome />
        </nav>
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
  return (
    <footer class="site-footer rb-site-footer">
      <SiteNav placement="secondary" />
    </footer>
  );
}
