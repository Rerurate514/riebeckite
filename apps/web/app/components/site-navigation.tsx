import type { NavigationItem } from "@riebeckite/core";
import { config } from "../config";

export function SiteHeader({ path }: { path: string }) {
  const navigation = config.navigation.header.filter(
    (item) => item.href !== "/",
  );

  return (
    <header class="site-header rb-site-header">
      <a href="/" class="site-header__home rb-site-header__home">
        {config.site.title}
      </a>
      {navigation.length > 0 ? (
        <>
          <SiteNavigation items={navigation} path={path} />
          <details class="site-navigation__mobile rb-nav__mobile">
            <summary class="rb-nav__toggle">Menu</summary>
            <SiteNavigation items={navigation} path={path} />
          </details>
        </>
      ) : null}
    </header>
  );
}

export function SiteFooter({ path }: { path: string }) {
  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__main">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__project">
            Riebeckite
          </a>
          <p class="site-footer__description">
            An open-source framework for publishing Markdown sites.
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
        {config.navigation.footer.length > 0 ? (
          <SiteNavigation
            items={config.navigation.footer}
            path={path}
            label="Footer navigation"
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

function SiteNavigation({
  items,
  path,
  label = "Site navigation",
}: {
  items: readonly NavigationItem[];
  path: string;
  label?: string;
}) {
  return (
    <nav class="site-navigation rb-nav" aria-label={label}>
      <NavigationItems items={items} path={path} />
    </nav>
  );
}

function NavigationItems({
  items,
  path,
  isChildList = false,
}: {
  items: readonly NavigationItem[];
  path: string;
  isChildList?: boolean;
}) {
  return (
    <ul
      class={
        isChildList
          ? "site-navigation__list rb-nav__list rb-nav__children"
          : "site-navigation__list rb-nav__list"
      }
    >
      {items.map((item) => {
        const active = isActive(item.href, path);
        const href = localizeDocsHref(item.href, path);
        return (
          <li class="site-navigation__item rb-nav__item">
            <a
              href={href}
              class={
                active
                  ? "site-navigation__link rb-nav__link rb-nav__link--active is-active"
                  : "site-navigation__link rb-nav__link"
              }
              aria-current={active ? "page" : undefined}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              {item.label}
            </a>
            {item.children && item.children.length > 0 ? (
              <NavigationItems items={item.children} path={path} isChildList />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function isActive(href: string, path: string): boolean {
  if (!href.startsWith("/")) return false;
  const target = href.replace(/\/+$/, "") || "/";
  const current =
    path.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, "").replace(/\/+$/, "") ||
    "/";
  return target === "/"
    ? current === target
    : current === target || current.startsWith(`${target}/`);
}

export function localizeDocsHref(href: string, path: string): string {
  const language = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/.exec(path)?.[1];
  if (!language || !href.startsWith("/docs/")) return href;
  return `/${language}${href}`;
}
