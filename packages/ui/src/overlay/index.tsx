/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export const OVERLAY_HOST_ATTRIBUTE = "data-rb-overlay-host";

export type OverlayHostProps = {
  name: string;
  children?: Child;
};

export function OverlayHost(props: OverlayHostProps) {
  return <div data-rb-overlay-host={props.name}>{props.children}</div>;
}

export function findOverlayHost(
  name: string,
  root: ParentNode = document,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[${OVERLAY_HOST_ATTRIBUTE}="${CSS.escape(name)}"]`,
  );
}
