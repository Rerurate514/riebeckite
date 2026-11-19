import { resolveSiteNavigation, SiteNav } from "@riebeckite/plugin-navigation";
import { useSiteContext } from "@riebeckite/ui";
import type { Child } from "hono/jsx";
import { resolveWebLocale } from "../lib/locale";
import { localizeDocsHref } from "../lib/navigation-link";
import { resolveUiLabels } from "../lib/ui-labels";

export function SiteHeader(props: { readonly children?: Child }) {
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
        <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
        <span>{site?.config.site.title}</span>
      </a>
      <nav
        class="site-header__navigation"
        aria-label={resolveUiLabels(site?.language).primaryNavigation}
      >
        {hasNavigation ? (
          <SiteNav
            placement="primary"
            omitHome
            localizeHref={(href) => localizeDocsHref(href, path)}
          />
        ) : null}
      </nav>
      <div class="site-header__actions">{props.children}</div>
    </header>
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
        label={resolveUiLabels(site?.language).secondaryNavigation}
        localizeHref={(href) => localizeDocsHref(href, path)}
      />
    </>
  );
}

export function SiteFooter() {
  const site = useSiteContext();
  const path = site?.path ?? "/";
  const isJapanese = resolveWebLocale(site?.language) === "ja";

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__main">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__project">
            <img src="/riebeckite-logo.png" alt="" width="28" height="28" />
            Riebeckite
          </a>
          <p class="site-footer__description">
            {isJapanese
              ? "Markdown と Obsidian からサイトをつくるオープンソースフレームワークです。"
              : "An open-source framework for building websites from Markdown and Obsidian."}
          </p>
          <div class="site-footer__author">
            <span>{isJapanese ? "作者" : "Author"}</span>
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
          label={resolveUiLabels(site?.language).footerNavigation}
          class="site-footer__navigation"
          localizeHref={(href) => localizeDocsHref(href, path)}
        />
      </div>
      <div class="site-footer__meta">
        <span>
          {isJapanese
            ? "オープンソース · Apache-2.0"
            : "Open source · Apache-2.0"}
        </span>
        <span>
          {isJapanese
            ? "プロジェクトコード: Riebeckite"
            : "Project code: Riebeckite"}
        </span>
      </div>
    </footer>
  );
}
