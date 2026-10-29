import type { Child } from "hono/jsx";
import { SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import {
  HeaderActions,
  HeaderBrand,
  ShowAt,
  SiteHeader as LayoutHeader,
} from "@riebeckite/layouts";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader(props: {
  readonly children?: Child;
  readonly sticky?: boolean;
}) {
  const site = useSiteContext();

  return (
    <>
      <ColorModeToggle placement="floating" />
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
        <HeaderActions wrap>
          <ShowAt min="md">
            <SiteNav placement="primary" omitHome />
          </ShowAt>
          <ColorModeToggle />
          {props.children}
        </HeaderActions>
      </LayoutHeader>
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
