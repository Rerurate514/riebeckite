import type { Child } from "hono/jsx";

type LayoutProps = {
  readonly children?: Child;
  readonly class?: string;
  readonly className?: string;
};

export type SiteShellProps = LayoutProps;
export type SiteHeaderProps = LayoutProps & { readonly sticky?: boolean };
export type ShellMainProps = LayoutProps & {
  readonly id?: string;
  readonly tabindex?: number;
};
export type DrawerProps = LayoutProps & {
  readonly label?: string;
  readonly icon?: "menu";
};

export function SiteShell(props: SiteShellProps) {
  return (
    <div class={join("rb-layout", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ShellContainer(props: LayoutProps) {
  return (
    <div class={join("rb-layout__container", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ContentContainer(props: LayoutProps) {
  return (
    <div class={join("rb-content-container", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function SiteHeader(props: SiteHeaderProps) {
  return (
    <header
      class={join("rb-layout__header", props.class, props.className)}
      data-rb-layout-sticky={props.sticky ? "true" : undefined}
    >
      {props.children}
    </header>
  );
}

export function HeaderBrand(props: LayoutProps) {
  return (
    <div class={join("rb-layout__header-brand", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function HeaderActions(props: LayoutProps) {
  return (
    <div
      class={join("rb-layout__header-actions", props.class, props.className)}
    >
      {props.children}
    </div>
  );
}

export function ShellBody(props: LayoutProps) {
  return (
    <div class={join("rb-layout__body", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ShellSidebar(props: LayoutProps) {
  return (
    <aside class={join("rb-layout__sidebar", props.class, props.className)}>
      {props.children}
    </aside>
  );
}

export function ShellMain(props: ShellMainProps) {
  return (
    <main
      id={props.id}
      tabindex={props.tabindex}
      class={join("rb-layout__main", props.class, props.className)}
    >
      {props.children}
    </main>
  );
}

export function ShellAside(props: LayoutProps) {
  return (
    <aside class={join("rb-layout__aside", props.class, props.className)}>
      {props.children}
    </aside>
  );
}

export function Drawer(props: DrawerProps) {
  return (
    <div
      class={join("rb-layout__drawer", props.class, props.className)}
      data-rb-layout-drawer
    >
      <button
        type="button"
        class="rb-layout__drawer-trigger"
        data-rb-layout-drawer-trigger
        aria-expanded="false"
        aria-label={
          props.icon === "menu" ? (props.label ?? "Navigation") : undefined
        }
        data-rb-layout-drawer-icon={props.icon}
      >
        {props.icon === "menu" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        ) : (
          <span>{props.label ?? "Navigation"}</span>
        )}
      </button>
      <div
        class="rb-layout__drawer-panel"
        data-rb-layout-drawer-panel
        role="dialog"
        aria-label={props.label ?? "Navigation"}
        tabindex={-1}
        hidden
      >
        {props.children}
      </div>
    </div>
  );
}

function join(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}
