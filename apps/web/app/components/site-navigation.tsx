import { resolveSiteNavigation, SiteNav } from "@riebeckite/plugin-navigation";
import { useSiteContext } from "@riebeckite/ui";
import { localizeDocsHref } from "../lib/navigation-link";

export function SiteHeader() {
  const site = useSiteContext();
  const path = site?.path ?? "/";
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
        {site?.config.site.title}
      </a>
      {hasNavigation ? (
        <>
          <SiteNav
            placement="primary"
            omitHome
            localizeHref={(href) => localizeDocsHref(href, path)}
          />
          <details class="rb-nav__mobile">
            <summary class="rb-nav__toggle">Menu</summary>
            <SiteNav
              placement="primary"
              omitHome
              localizeHref={(href) => localizeDocsHref(href, path)}
            />
          </details>
        </>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const site = useSiteContext();
  const path = site?.path ?? "/";

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__main">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__project">
            Riebeckite
          </a>
          <p class="site-footer__description">
            An open-source framework for building websites from Markdown and
            Obsidian.
          </p>
          <div class="site-footer__author">
            <span>Author</span>
            <a href="https://x.com/rerurate" target="_blank" rel="noreferrer">
              X / Twitter
            </a>
            <a
              href="https://github.com/Rerurate514"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
        <SiteNav
          placement="secondary"
          label="Footer navigation"
          localizeHref={(href) => localizeDocsHref(href, path)}
        />
      </div>
      <div class="site-footer__meta">
        <span>Open source · Apache-2.0</span>
        <span>Project code: Riebeckite</span>
      </div>
    </footer>
  );
}
