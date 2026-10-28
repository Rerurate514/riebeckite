import { resolveSiteNavigation, SiteNav } from "@riebeckite/plugin-navigation";
import { getRecentPosts, RecentPosts } from "@riebeckite/plugin-recent-posts";
import { useSiteContext } from "@riebeckite/ui";
import { resolveWebLocale } from "../lib/locale";
import { localizeDocsHref } from "../lib/navigation-link";

export function SiteHeader(props: { readonly children?: unknown }) {
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
    <div class="site-header rb-site-header">
      <a href="/" class="site-header__home rb-site-header__home">
        <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
        <span>{site?.config.site.title}</span>
      </a>
      <div class="site-header__end">
        {hasNavigation ? (
          <div class="site-header__primary-navigation">
            <SiteNav
              placement="primary"
              omitHome
              localizeHref={(href) => localizeDocsHref(href, path)}
            />
          </div>
        ) : null}
        <div class="site-header__actions">{props.children}</div>
      </div>
    </div>
  );
}

export function SiteDrawerNavigation() {
  const site = useSiteContext();
  const path = site?.path ?? "/";

  return (
    <>
      <SiteNav
        placement="primary"
        omitHome
        localizeHref={(href) => localizeDocsHref(href, path)}
      />
      <SiteNav
        placement="secondary"
        label="Secondary navigation"
        localizeHref={(href) => localizeDocsHref(href, path)}
      />
    </>
  );
}

export function SiteFooter() {
  const site = useSiteContext();
  const path = site?.path ?? "/";
  const language = resolveWebLocale(site?.language);
  const posts = site
    ? getRecentPosts({
        manifest: {
          discoverableEntries: site.manifest.discoverableEntries.filter(
            (entry) =>
              resolveWebLocale(entry.publicLocation.language) === language,
          ),
        },
      })
    : [];

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__main">
        <div class="site-footer__identity">
          <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
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
        <div class="site-footer__recent">
          <RecentPosts posts={posts} locale={language} variant="compact" />
        </div>
        <SiteNav
          placement="secondary"
          label="Footer navigation"
          class="site-footer__navigation"
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
