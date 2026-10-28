import type { Child } from "hono/jsx";

type ShellProps = {
  readonly children?: Child;
  readonly class?: string;
  readonly className?: string;
};

export type SiteShellProps = ShellProps;

export type ShellHeaderProps = ShellProps & { readonly sticky?: boolean };
export type ShellSidebarProps = ShellProps & { readonly collapsible?: boolean };
export type ShellMainProps = ShellProps & {
  readonly id?: string;
  readonly tabindex?: number;
};
export type ShellDrawerProps = ShellProps & {
  readonly label?: string;
  readonly icon?: "menu";
};

export function SiteShell(props: SiteShellProps) {
  return (
    <div class={join("rb-shell", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ShellContainer(props: ShellProps) {
  return (
    <div class={join("rb-shell__container", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ContentContainer(props: ShellProps) {
  return (
    <div class={join("rb-content-container", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ShellHeader(props: ShellHeaderProps) {
  return (
    <header
      class={join("rb-shell__header", props.class, props.className)}
      data-rb-shell-sticky={props.sticky ? "true" : undefined}
    >
      {props.children}
    </header>
  );
}

export function ShellBody(props: ShellProps) {
  return (
    <div class={join("rb-shell__body", props.class, props.className)}>
      {props.children}
    </div>
  );
}

export function ShellSidebar(props: ShellSidebarProps) {
  return (
    <aside
      class={join("rb-shell__sidebar", props.class, props.className)}
      data-rb-shell-collapsible={props.collapsible ? "true" : undefined}
    >
      {props.children}
    </aside>
  );
}

export function ShellMain(props: ShellMainProps) {
  return (
    <main
      id={props.id}
      tabindex={props.tabindex}
      class={join("rb-shell__main", props.class, props.className)}
    >
      {props.children}
    </main>
  );
}

export function ShellAside(props: ShellProps) {
  return (
    <aside class={join("rb-shell__aside", props.class, props.className)}>
      {props.children}
    </aside>
  );
}

export function ShellDrawer(props: ShellDrawerProps) {
  return (
    <div
      class={join("rb-shell__drawer", props.class, props.className)}
      data-rb-shell-drawer
    >
      <button
        type="button"
        class="rb-shell__drawer-trigger"
        data-rb-shell-drawer-trigger
        aria-expanded="false"
      >
        {props.icon === "menu" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        ) : null}
        <span>{props.label ?? "Navigation"}</span>
      </button>
      <div class="rb-shell__drawer-panel" data-rb-shell-drawer-panel hidden>
        {props.children}
      </div>
    </div>
  );
}

export function SiteBrand(props: ShellProps) {
  return (
    <div class={join("rb-shell__brand", props.class, props.className)}>
      {props.children}
    </div>
  );
}

function join(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}
