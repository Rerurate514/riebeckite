import { SiteNav } from "@riebeckite/plugin-navigation";
import type { NavigationItem } from "@riebeckite/plugin-navigation";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { config } from "virtual:riebeckite/config";

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
          <SiteNav items={navigation} path={path} language={language} />
          <details class="rb-nav__mobile">
            <summary class="rb-nav__toggle">Menu</summary>
            <SiteNav items={navigation} path={path} language={language} />
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
  language,
}: {
  path: string;
  items: readonly NavigationItem[];
  language?: string;
}) {
  if (items.length === 0) return null;

  return (
    <footer class="site-footer rb-site-footer">
      <SiteNav items={items} path={path} language={language} />
    </footer>
  );
}
