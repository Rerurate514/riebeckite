/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

type LayoutProps = {
  readonly children?: Child;
  readonly class?: string;
  readonly className?: string;
};

export type DrawerProps = LayoutProps & {
  readonly id: string;
  readonly label?: string;
};

export type DrawerTriggerProps = LayoutProps & {
  readonly controls: string;
  readonly label?: string;
  readonly icon?: "menu";
};

export function Drawer(props: DrawerProps) {
  return (
    <div
      class={join("rb-drawer", props.class, props.className)}
      data-rb-drawer
      data-rb-drawer-open="false"
    >
      <div class="rb-drawer__backdrop" data-rb-drawer-backdrop hidden />
      <section
        id={props.id}
        class="rb-drawer__panel"
        data-rb-drawer-panel
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
        "rb-drawer-trigger",
        props.icon === "menu" && "rb-drawer-trigger--icon",
        props.class,
        props.className,
      )}
      aria-controls={props.controls}
      aria-expanded="false"
      aria-label={props.icon === "menu" ? (props.label ?? "Menu") : undefined}
      data-rb-drawer-trigger
      data-rb-drawer-target={props.controls}
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

function join(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}
