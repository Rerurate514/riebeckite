import { MobileSiteNav, SiteNav } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();

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
      <div class="site-header__primary-navigation">
        <SiteNav placement="primary" omitHome />
      </div>
      <div class="site-header__mobile-navigation">
        <MobileSiteNav placement="primary" omitHome />
      </div>
      <SearchBar class="rr-search-bar--header" />
      <ColorModeToggle />
    </header>
  );
}

export function SiteFooter() {
  const site = useSiteContext();

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__home">
            <img
              src="/riebeckite-logo.png"
              alt=""
              class="site-footer__logo"
              width="20"
              height="20"
            />
            <span>{site?.config.site.title}</span>
          </a>
          {site?.config.site.description ? (
            <p class="site-footer__description">
              {site.config.site.description}
            </p>
          ) : null}
        </div>
        <SiteNav
          placement="secondary"
          label="Footer navigation"
          class="site-footer__navigation"
        />
      </div>
      <div class="site-footer__meta">
        <span>Built with Riebeckite</span>
        <a href="https://riebeckite.dev">riebeckite.dev</a>
      </div>
    </footer>
  );
}
