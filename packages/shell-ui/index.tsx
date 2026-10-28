import type { Child } from "hono/jsx";

type ShellProps = {
  readonly children?: Child;
  readonly class?: string;
  readonly className?: string;
};

export type SiteShellProps = ShellProps & {
  readonly variant?: "docs" | "wiki" | "blog" | "dashboard";
};

export type ShellHeaderProps = ShellProps & { readonly sticky?: boolean };
export type ShellSidebarProps = ShellProps & { readonly collapsible?: boolean };
export type ShellDrawerProps = ShellProps & { readonly label?: string };

export function SiteShell(props: SiteShellProps) {
  return (
    <div
      class={join("rb-shell", props.class, props.className)}
      data-rb-shell={props.variant ?? "docs"}
    >
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

export function ShellMain(props: ShellProps) {
  return (
    <main class={join("rb-shell__main", props.class, props.className)}>
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
    <details class={join("rb-shell__drawer", props.class, props.className)}>
      <summary>{props.label ?? "Navigation"}</summary>
      <div class="rb-shell__drawer-panel">{props.children}</div>
    </details>
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
