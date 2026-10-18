import { SiteNav } from "@riebeckite/plugin-navigation";
import { resolveSiteNavigation } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();
  const hasNavigation = site
    ? (resolveSiteNavigation(site.config, site.manifest, site.language)?.primary.some(
        (item) => item.href !== "/",
      ) ?? false)
    : false;

  return (
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
      {hasNavigation ? (
        <>
          <SiteNav placement="primary" omitHome />
          <details class="rb-nav__mobile">
            <summary class="rb-nav__toggle">Menu</summary>
            <SiteNav placement="primary" omitHome />
          </details>
        </>
      ) : null}
      <ColorModeToggle />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer class="site-footer rb-site-footer">
      <SiteNav placement="secondary" />
    </footer>
  );
}
