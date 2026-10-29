import { SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import {
  Drawer,
  DrawerTrigger,
  HeaderActions,
  HeaderBrand,
  ShowAt,
  SiteHeader as LayoutHeader,
} from "@riebeckite/layouts";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();

  return (
    <>
      <ColorModeToggle placement="floating" />
      <LayoutHeader class="site-header rb-site-header">
        <HeaderBrand>
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
        </HeaderBrand>
        <HeaderActions wrap>
          <ShowAt min="sm">
            <SiteNav placement="primary" omitHome />
          </ShowAt>
          <ColorModeToggle />
          <DrawerTrigger
            controls="site-navigation"
            label="Menu"
            icon="menu"
            at="sm"
          />
        </HeaderActions>
      </LayoutHeader>
      <Drawer id="site-navigation" label="Navigation" at="sm">
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
