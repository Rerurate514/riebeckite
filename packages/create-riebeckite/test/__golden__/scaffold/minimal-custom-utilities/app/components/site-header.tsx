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
