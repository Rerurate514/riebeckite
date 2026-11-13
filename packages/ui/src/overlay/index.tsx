/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";

export const OVERLAY_HOST_ATTRIBUTE = "data-rb-overlay-host";
export const APP_SLOT_ATTRIBUTE = "data-rb-app-slot";

export type AppSlotName = "head" | "bodyStart" | "articleAfter" | "app";

export type AppSlotProps = {
  name: AppSlotName;
  as?: "div" | "section" | "aside" | "header" | "footer";
  children?: Child;
};

export function AppSlot({ name, as = "div", children }: AppSlotProps) {
  const Tag = as;
  return <Tag data-rb-app-slot={name}>{children}</Tag>;
}

export function findAppSlot(
  name: AppSlotName,
  root: ParentNode = document,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[${APP_SLOT_ATTRIBUTE}="${CSS.escape(name)}"]`,
  );
}

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
