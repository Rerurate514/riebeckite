import { MobileSiteNav, SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import {
  HeaderActions,
  HeaderBrand,
  SiteHeader as LayoutHeader,
} from "@riebeckite/layouts";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader(props: {
  readonly children?: unknown;
  readonly sticky?: boolean;
}) {
  const site = useSiteContext();

  return (
    <LayoutHeader class="site-header rb-site-header" sticky={props.sticky}>
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
      <HeaderActions>
      <div class="site-header__primary-navigation">
        <SiteNav placement="primary" omitHome />
      </div>
      <div class="site-header__mobile-navigation">
        <MobileSiteNav placement="primary" omitHome />
      </div>
      <ColorModeToggle />
      {props.children}
      </HeaderActions>
    </LayoutHeader>
  );
}

export function SiteFooter() {
  return (
    <footer class="site-footer rb-site-footer">
      <SiteNav placement="secondary" />
    </footer>
  );
}
