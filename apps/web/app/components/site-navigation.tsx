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
            <summary class="rb-nav__toggle" aria-label="Open navigation">
              Menu
            </summary>
            <SiteNavigation items={navigation} path={path} />
          </details>
        </>
      ) : null}
    </header>
  );
}

export function SiteFooter({ path }: { path: string }) {
  if (config.navigation.footer.length === 0) return null;

  return (
    <footer class="site-footer rb-site-footer">
      <SiteNavigation items={config.navigation.footer} path={path} />
    </footer>
  );
}

function SiteNavigation({
  items,
  path,
}: {
  items: readonly NavigationItem[];
  path: string;
}) {
  return (
    <nav class="site-navigation rb-nav" aria-label="Site navigation">
      <NavigationItems items={items} path={path} />
    </nav>
  );
}

function NavigationItems({
  items,
  path,
  children = false,
}: {
  items: readonly NavigationItem[];
  path: string;
  children?: boolean;
}) {
  return (
    <ul
      class={
        children
          ? "site-navigation__list rb-nav__list rb-nav__children"
          : "site-navigation__list rb-nav__list"
      }
    >
      {items.map((item) => {
        const active = isActive(item.href, path);
        return (
          <li class="site-navigation__item rb-nav__item">
            <a
              href={item.href}
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
              <NavigationItems items={item.children} path={path} children />
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
  const current = path.replace(/\/+$/, "") || "/";
  return target === "/"
    ? current === target
    : current === target || current.startsWith(`${target}/`);
}
