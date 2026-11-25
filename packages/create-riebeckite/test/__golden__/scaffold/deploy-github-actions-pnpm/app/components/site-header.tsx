import { useSiteContext } from "@riebeckite/ui";

export function SiteHeader() {
  const site = useSiteContext();

  return (
    <header class="site-header rb-site-header">
      <a href="/" class="site-header__home rb-site-header__home">
        {site?.config.site.title}
      </a>
      <span class="site-header__rule" aria-hidden="true" />
    </header>
  );
}

export function SiteFooter() {
  const site = useSiteContext();

  return (
    <footer class="site-footer rb-site-footer">
      <span>{site?.config.site.title}</span>
      <span>
        Built with <a href="https://riebeckite.dev">Riebeckite</a>
      </span>
    </footer>
  );
}
