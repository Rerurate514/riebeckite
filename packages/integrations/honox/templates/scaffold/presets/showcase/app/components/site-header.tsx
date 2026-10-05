import type { NavigationItem } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { config } from "../config";

export function SiteHeader({
  path,
  items,
}: {
  path: string;
  items: readonly NavigationItem[];
}) {
  const navigation = items.filter((item) => item.href !== "/");

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
      <ColorModeToggle />
    </header>
  );
}

export function SiteFooter({
  path,
  items,
}: {
  path: string;
  items: readonly NavigationItem[];
}) {
  if (items.length === 0) return null;

  return (
    <footer class="site-footer rb-site-footer">
      <SiteNavigation items={items} path={path} />
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
  isChildList = false,
}: {
  items: readonly NavigationItem[];
  path: string;
  isChildList?: boolean;
}) {
  return (
    <ul class={isChildList ? "site-navigation__list rb-nav__list rb-nav__children" : "site-navigation__list rb-nav__list"}>
      {items.map((item) => {
        const active = item.href ? isActive(item.href, path) : false;
        return (
          <li class="site-navigation__item rb-nav__item">
            {item.href ? (
              <a
                href={item.href}
                class={active ? "site-navigation__link rb-nav__link rb-nav__link--active is-active" : "site-navigation__link rb-nav__link"}
                aria-current={active ? "page" : undefined}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <span class="site-navigation__label rb-nav__label">{item.label}</span>
            )}
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
  const current = path.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  return target === "/" ? current === target : current === target || current.startsWith(`${target}/`);
}
