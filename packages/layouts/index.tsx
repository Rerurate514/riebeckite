/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export type Breakpoint = "sm" | "md" | "lg" | "xl";
export type Space = 1 | 2 | 3 | 4 | 5 | 6;

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
export type ShellSidebarProps = LayoutProps & {
  readonly at?: Breakpoint;
};
export type ShellAsideProps = LayoutProps & {
  readonly at?: Breakpoint;
};
export type ContentContainerProps = LayoutProps & {
  readonly size?: "content" | "page";
};
export type HeaderActionsProps = LayoutProps & {
  readonly wrap?: boolean;
};
export type DrawerProps = LayoutProps & {
  readonly id: string;
  readonly label?: string;
  readonly desktop?: "hidden" | "inline";
  readonly at?: Breakpoint;
};
export type DrawerTriggerProps = LayoutProps & {
  readonly controls: string;
  readonly label?: string;
  readonly icon?: "menu";
  readonly at?: Breakpoint;
};
export type ShowAtProps = LayoutProps & {
  readonly min?: Breakpoint;
  readonly max?: Breakpoint;
};
export type StackProps = LayoutProps & {
  readonly gap?: Space;
  readonly align?: "start" | "center" | "end" | "stretch";
};
export type ClusterProps = LayoutProps & {
  readonly gap?: Space;
  readonly align?: "start" | "center" | "end" | "stretch";
  readonly justify?: "start" | "center" | "end" | "between";
};
export type ResponsiveGridProps = LayoutProps & {
  readonly gap?: Space;
  readonly min?: string;
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

export function ContentContainer(props: ContentContainerProps) {
  return (
    <div
      class={join(
        "rb-content-container",
        props.size === "page" && "rb-content-container--page",
        props.class,
        props.className,
      )}
    >
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

export function HeaderActions(props: HeaderActionsProps) {
  return (
    <div
      class={join("rb-layout__header-actions", props.class, props.className)}
      data-rb-layout-wrap={props.wrap ? "true" : undefined}
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

export function ShellSidebar(props: ShellSidebarProps) {
  return (
    <aside
      class={join("rb-layout__sidebar", props.class, props.className)}
      data-rb-layout-at={props.at ?? "md"}
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
      class={join("rb-layout__main", props.class, props.className)}
    >
      {props.children}
    </main>
  );
}

export function ShellAside(props: ShellAsideProps) {
  return (
    <aside
      class={join("rb-layout__aside", props.class, props.className)}
      data-rb-layout-at={props.at ?? "lg"}
    >
      {props.children}
    </aside>
  );
}

export function Drawer(props: DrawerProps) {
  return (
    <div
      class={join("rb-layout__drawer", props.class, props.className)}
      data-rb-layout-drawer
      data-rb-layout-drawer-desktop={props.desktop ?? "hidden"}
      data-rb-layout-drawer-at={props.at ?? "md"}
      data-rb-layout-drawer-open="false"
    >
      <div
        class="rb-layout__drawer-backdrop"
        data-rb-layout-drawer-backdrop
        hidden
      />
      <section
        id={props.id}
        class="rb-layout__drawer-panel"
        data-rb-layout-drawer-panel
        aria-label={props.label ?? "Navigation"}
        tabindex={-1}
      >
        {props.children}
      </section>
    </div>
  );
}

export function DrawerTrigger(props: DrawerTriggerProps) {
  return (
    <a
      href={`#${props.controls}`}
      class={join(
        "rb-layout__drawer-trigger",
        props.icon === "menu" && "rb-layout__drawer-trigger--icon",
        props.class,
        props.className,
      )}
      aria-controls={props.controls}
      aria-expanded="false"
      aria-label={props.icon === "menu" ? (props.label ?? "Menu") : undefined}
      data-rb-layout-drawer-trigger
      data-rb-layout-drawer-target={props.controls}
      data-rb-layout-trigger-at={props.at ?? "md"}
    >
      {props.icon === "menu" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ) : (
        <span>{props.label ?? "Menu"}</span>
      )}
    </a>
  );
}

export function ShowAt(props: ShowAtProps) {
  return (
    <div
      class={join("rb-show-at", props.class, props.className)}
      data-rb-show-min={props.min}
      data-rb-show-max={props.max}
    >
      {props.children}
    </div>
  );
}

export function Stack(props: StackProps) {
  return (
    <div
      class={join("rb-stack", props.class, props.className)}
      data-rb-layout-gap={props.gap}
      data-rb-layout-align={props.align}
    >
      {props.children}
    </div>
  );
}

export function Cluster(props: ClusterProps) {
  return (
    <div
      class={join("rb-cluster", props.class, props.className)}
      data-rb-layout-gap={props.gap}
      data-rb-layout-align={props.align}
      data-rb-layout-justify={props.justify}
    >
      {props.children}
    </div>
  );
}

export function ResponsiveGrid(props: ResponsiveGridProps) {
  return (
    <div
      class={join("rb-responsive-grid", props.class, props.className)}
      data-rb-layout-gap={props.gap}
      style={props.min ? `--rb-grid-min:${props.min}` : undefined}
    >
      {props.children}
    </div>
  );
}

function join(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}
