import { SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
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
        <ColorModeToggle />
      </header>
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
