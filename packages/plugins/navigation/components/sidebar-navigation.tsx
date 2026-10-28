import { useSiteContext } from "@riebeckite/ui";
import type { NavigationItem } from "../src/types.js";

export type SidebarNavigationProps = {
  readonly items: readonly NavigationItem[];
  readonly path?: string;
  readonly language?: string;
  readonly label?: string;
  readonly searchable?: boolean;
  readonly collapsible?: boolean;
  readonly nativeDetails?: boolean;
  readonly autoExpandActive?: boolean;
  readonly class?: string;
  readonly className?: string;
};

export function SidebarNavigation(props: SidebarNavigationProps) {
  const site = useSiteContext();
  const path = props.path ?? site?.path ?? "/";
  const language = props.language ?? site?.language;
  const searchable = props.searchable ?? false;
  const collapsible = props.collapsible ?? true;
  const nativeDetails = props.nativeDetails ?? false;
  const autoExpandActive = props.autoExpandActive ?? true;

  return (
    <nav
      class={join("rb-sidebar-navigation", props.class, props.className)}
      aria-label={props.label ?? "Sidebar navigation"}
      data-sidebar-navigation
      data-sidebar-auto-expand={autoExpandActive ? "true" : "false"}
    >
      {searchable ? (
        <label class="rb-sidebar-navigation__search">
          <span class="rb-sidebar-navigation__sr-only">Filter navigation</span>
          <input
            type="search"
            autocomplete="off"
            placeholder="Filter"
            data-sidebar-filter
          />
        </label>
      ) : null}
      <SidebarItems
        items={props.items}
        path={path}
        language={language}
        collapsible={collapsible}
        nativeDetails={nativeDetails}
        autoExpandActive={autoExpandActive}
      />
    </nav>
  );
}

type SidebarItemsProps = {
  readonly items: readonly NavigationItem[];
  readonly path: string;
  readonly language?: string;
  readonly collapsible: boolean;
  readonly nativeDetails: boolean;
  readonly autoExpandActive: boolean;
};

function SidebarItems(props: SidebarItemsProps) {
  return (
    <ul class="rb-sidebar-navigation__list">
      {props.items.map((item, index) => (
        <SidebarItem
          item={item}
          path={props.path}
          language={props.language}
          collapsible={props.collapsible}
          nativeDetails={props.nativeDetails}
          autoExpandActive={props.autoExpandActive}
          key={`${item.href ?? item.label}-${index}`}
        />
      ))}
    </ul>
  );
}

function SidebarItem(
  props: Omit<SidebarItemsProps, "items"> & { readonly item: NavigationItem },
) {
  const children = props.item.children ?? [];
  const active = props.item.href
    ? isActive(props.item.href, props.path, props.language)
    : false;
  const activeBranch =
    active ||
    children.some((item) => containsActive(item, props.path, props.language));
  const expanded =
    props.autoExpandActive && activeBranch ? true : !props.item.collapsed;
  const hasChildren = children.length > 0;
  const label = props.item.href ? (
    <a
      class={
        active
          ? "rb-sidebar-navigation__link rb-sidebar-navigation__link--active"
          : "rb-sidebar-navigation__link"
      }
      href={props.item.href}
      aria-current={active ? "page" : undefined}
      target={props.item.external ? "_blank" : undefined}
      rel={props.item.external ? "noreferrer" : undefined}
    >
      <Icon icon={props.item.icon} />
      {props.item.label}
    </a>
  ) : (
    <span class="rb-sidebar-navigation__section">
      <Icon icon={props.item.icon} />
      {props.item.label}
    </span>
  );

  return (
    <li
      class="rb-sidebar-navigation__item"
      data-sidebar-item
      data-sidebar-label={props.item.label.toLocaleLowerCase()}
      data-sidebar-expanded={hasChildren ? String(expanded) : undefined}
    >
      {hasChildren && props.collapsible && props.nativeDetails ? (
        <details class="rb-sidebar-navigation__details" open={expanded}>
          <summary class="rb-sidebar-navigation__row">{label}</summary>
          <SidebarItems {...props} items={children} />
        </details>
      ) : (
        <>
          <div class="rb-sidebar-navigation__row">
            {label}
            {hasChildren && props.collapsible ? (
              <button
                class="rb-sidebar-navigation__toggle"
                type="button"
                aria-label={`${expanded ? "Collapse" : "Expand"} ${props.item.label}`}
                aria-expanded={String(expanded)}
                data-sidebar-toggle
              >
                <span aria-hidden="true">›</span>
              </button>
            ) : null}
          </div>
          {hasChildren ? <SidebarItems {...props} items={children} /> : null}
        </>
      )}
    </li>
  );
}

function Icon({ icon }: { readonly icon: NavigationItem["icon"] }) {
  return icon ? (
    <span
      class="rb-sidebar-navigation__icon"
      dangerouslySetInnerHTML={{ __html: icon.html }}
    />
  ) : null;
}

function containsActive(
  item: NavigationItem,
  path: string,
  language?: string,
): boolean {
  return (
    Boolean(item.href && isActive(item.href, path, language)) ||
    (item.children?.some((child) => containsActive(child, path, language)) ??
      false)
  );
}

function isActive(href: string, path: string, language?: string): boolean {
  if (!href.startsWith("/")) return false;
  const target = normalizePath(href);
  const current = normalizePath(stripLanguagePrefix(path, language));
  return current === target;
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function stripLanguagePrefix(path: string, language?: string): string {
  if (!language) return path;
  if (path === `/${language}`) return "/";
  const prefix = `/${language}/`;
  return path.startsWith(prefix) ? path.slice(language.length + 1) : path;
}

function join(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}
