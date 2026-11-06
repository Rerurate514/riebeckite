import { resolveSiteNavigation, SiteNav } from "@riebeckite/plugin-navigation";
import { RecentPosts } from "@riebeckite/plugin-recent-posts";
import { useSiteContext } from "@riebeckite/ui";
import type { Child } from "hono/jsx";

export function SiteHeader(props: { readonly children?: Child }) {
  const site = useSiteContext();
  const hasNavigation = site
    ? (resolveSiteNavigation(
        site.config,
        site.manifest,
        site.language,
      )?.primary.some((item) => item.href !== "/") ?? false)
    : false;

  return (
    <header class="site-header rb-site-header">
      <a href="/" class="site-header__home rb-site-header__home">
        <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
        <span>{site?.config.site.title}</span>
      </a>
      <nav class="site-header__navigation" aria-label="Primary navigation">
        {hasNavigation ? <SiteNav placement="primary" omitHome /> : null}
      </nav>
      <div class="site-header__actions">{props.children}</div>
    </header>
  );
}

export function SiteDrawerNavigation() {
  return (
    <>
      <SiteNav placement="primary" omitHome />
      <SiteNav placement="secondary" label="Secondary navigation" />
    </>
  );
}

export function SiteFooter() {
  const site = useSiteContext();

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__main">
        <div class="site-footer__identity">
          <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
          <a href="/" class="site-footer__project">
            {site?.config.site.title}
          </a>
          <p class="site-footer__description">
            {site?.config.site.description}
          </p>
        </div>
        <div class="site-footer__recent">
          <RecentPosts variant="compact" />
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
