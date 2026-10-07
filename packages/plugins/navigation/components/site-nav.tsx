import type { NavigationItem } from "../src/types.js";

export type SiteNavProps = {
  /** Navigation tree to render, in order. */
  readonly items: readonly NavigationItem[];
  /** Current request path, used to mark the active item. */
  readonly path: string;
  /**
   * Current content language. When set, a matching `/language` prefix is
   * stripped from `path` before the active item is resolved.
   */
  readonly language?: string;
  /** Accessible label for the `<nav>` landmark. Defaults to "Site navigation". */
  readonly label?: string;
  /** Rewrites each internal href before it is rendered. */
  readonly localizeHref?: (href: string) => string;
  /** Extra classes appended to the `<nav>` landmark. */
  readonly class?: string;
  readonly className?: string;
};

/**
 * Renders a resolved navigation tree as a `<nav>` landmark with nested lists.
 *
 * Owns the navigation rendering mechanics: recursive list markup, active-path
 * semantics with locale-aware normalization, external-link handling, and the
 * `aria-current` accessibility contract. The Site owns placement and decides
 * where each tree is rendered.
 */
export function SiteNav(props: SiteNavProps) {
  return (
    <nav
      class={joinClassNames("rb-nav", props.class, props.className)}
      aria-label={props.label ?? "Site navigation"}
    >
      <NavigationItems
        items={props.items}
        path={props.path}
        language={props.language}
        localizeHref={props.localizeHref}
      />
    </nav>
  );
}

type NavigationItemsProps = {
  readonly items: readonly NavigationItem[];
  readonly path: string;
  readonly language?: string;
  readonly localizeHref?: (href: string) => string;
  readonly nested?: boolean;
};

function NavigationItems(props: NavigationItemsProps) {
  return (
    <ul class={props.nested ? "rb-nav__list rb-nav__children" : "rb-nav__list"}>
      {props.items.map((item) => (
        <NavigationItemView
          item={item}
          path={props.path}
          language={props.language}
          localizeHref={props.localizeHref}
        />
      ))}
    </ul>
  );
}

type NavigationItemViewProps = {
  readonly item: NavigationItem;
  readonly path: string;
  readonly language?: string;
  readonly localizeHref?: (href: string) => string;
};

function NavigationItemView(props: NavigationItemViewProps) {
  const { item, path, language, localizeHref } = props;
  const active = item.href ? isActive(item.href, path, language) : false;
  const href = item.href ? (localizeHref?.(item.href) ?? item.href) : undefined;

  return (
    <li class="rb-nav__item">
      {href ? (
        <a
          href={href}
          class={active ? "rb-nav__link rb-nav__link--active" : "rb-nav__link"}
          aria-current={active ? "page" : undefined}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
        >
          {item.label}
        </a>
      ) : (
        <span class="rb-nav__label">{item.label}</span>
      )}
      {item.children && item.children.length > 0 ? (
        <NavigationItems
          items={item.children}
          path={path}
          language={language}
          localizeHref={localizeHref}
          nested
        />
      ) : null}
    </li>
  );
}

function isActive(href: string, path: string, language?: string): boolean {
  if (!href.startsWith("/")) return false;
  const target = normalizePath(href);
  const current = normalizePath(stripLanguagePrefix(path, language));
  if (target === "/") return current === target;
  return current === target || current.startsWith(`${target}/`);
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function stripLanguagePrefix(path: string, language?: string): string {
  if (!language) return path;
  if (path === `/${language}`) return "/";
  const prefix = `/${language}/`;
  if (path.startsWith(prefix)) return path.slice(language.length + 1);
  return path;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
