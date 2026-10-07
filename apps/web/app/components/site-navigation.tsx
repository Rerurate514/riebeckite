import type { NavigationItem } from "@riebeckite/plugin-navigation";
import { SiteNav } from "@riebeckite/plugin-navigation";
import { config } from "../config";

export function SiteHeader({
  path,
  items,
  language,
}: {
  path: string;
  items: readonly NavigationItem[];
  language?: string;
}) {
  const navigation = items.filter((item) => item.href !== "/");

  return (
    <header class="site-header rb-site-header">
      <a href="/" class="site-header__home rb-site-header__home">
        {config.site.title}
      </a>
      {navigation.length > 0 ? (
        <>
          <SiteNav
            items={navigation}
            path={path}
            language={language}
            localizeHref={(href) => localizeDocsHref(href, path)}
          />
          <details class="rb-nav__mobile">
            <summary class="rb-nav__toggle">Menu</summary>
            <SiteNav
              items={navigation}
              path={path}
              language={language}
              localizeHref={(href) => localizeDocsHref(href, path)}
            />
          </details>
        </>
      ) : null}
    </header>
  );
}

export function SiteFooter({
  path,
  items,
  language,
}: {
  path: string;
  items: readonly NavigationItem[];
  language?: string;
}) {
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
        {items.length > 0 ? (
          <SiteNav
            items={items}
            path={path}
            language={language}
            label="Footer navigation"
            localizeHref={(href) => localizeDocsHref(href, path)}
          />
        ) : null}
      </div>
      <div class="site-footer__meta">
        <span>Open source · Apache-2.0</span>
        <span>Project code: Riebeckite</span>
      </div>
    </footer>
  );
}

export function localizeDocsHref(href: string, path: string): string {
  const language = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/.exec(path)?.[1];
  if (!language || !href.startsWith("/docs/")) return href;
  return `/${language}${href}`;
}
