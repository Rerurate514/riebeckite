import { createDismissable } from "../behaviors/dismiss.js";
import { focusFirst, trapFocus } from "../behaviors/focus.js";
import { lockScroll } from "../behaviors/scroll-lock.js";

type DrawerState = {
  readonly drawer: HTMLElement;
  readonly panel: HTMLElement;
  readonly backdrop: HTMLElement | null;
  returnFocus: HTMLElement | null;
  releaseDismiss?: () => void;
  releaseScroll?: () => void;
};

const states = new Map<string, DrawerState>();
const openStates: DrawerState[] = [];
let listening = false;

export function initDrawers(): void {
  if (typeof document === "undefined") return;

  if (!listening) {
    listening = true;
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("spa:navigation", onNavigation);
  }

  for (const [key, state] of states) {
    if (state.drawer.isConnected) continue;
    states.delete(key);
  }

  for (const drawer of document.querySelectorAll<HTMLElement>(
    "[data-rb-drawer]",
  )) {
    const panel = drawer.querySelector<HTMLElement>("[data-rb-drawer-panel]");
    if (!panel?.id || states.has(panel.id)) continue;

    const state: DrawerState = {
      drawer,
      panel,
      backdrop: drawer.querySelector<HTMLElement>("[data-rb-drawer-backdrop]"),
      returnFocus: null,
    };
    states.set(panel.id, state);
    if (panel.matches(":target")) setOpen(state, true, false);
  }
}

function setOpen(state: DrawerState, open: boolean, restoreFocus = true): void {
  if (open) {
    for (const other of [...openStates]) {
      if (other !== state) setOpen(other, false, false);
    }
    if (!state.panel.isConnected) return;

    state.returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    state.drawer.dataset.rbDrawerOpen = "true";

    const overlay = getComputedStyle(state.panel).position === "fixed";
    if (overlay) {
      if (state.backdrop) state.backdrop.hidden = false;
      state.panel.setAttribute("role", "dialog");
      state.panel.setAttribute("aria-modal", "true");
      state.releaseScroll ??= lockScroll();
    }

    if (!openStates.includes(state)) openStates.push(state);
    state.releaseDismiss ??= createDismissable({
      dismiss: () => setOpen(state, false),
      contains: (target) =>
        state.drawer.contains(target) || isTriggerFor(target, state),
    });
    syncTriggers(state, true);
    focusFirst(state.panel);
    return;
  }

  state.drawer.dataset.rbDrawerOpen = "false";
  if (state.backdrop) state.backdrop.hidden = true;
  if (location.hash === `#${state.panel.id}`) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  state.panel.removeAttribute("role");
  state.panel.removeAttribute("aria-modal");

  const index = openStates.indexOf(state);
  if (index >= 0) openStates.splice(index, 1);
  state.releaseDismiss?.();
  state.releaseDismiss = undefined;
  state.releaseScroll?.();
  state.releaseScroll = undefined;

  syncTriggers(state, false);
  if (restoreFocus && state.returnFocus?.isConnected) state.returnFocus.focus();
  state.returnFocus = null;
}

function closeAll(restoreFocus: boolean): void {
  for (const state of [...openStates]) setOpen(state, false, restoreFocus);
}

function onNavigation(): void {
  closeAll(false);
  initDrawers();
}

function syncTriggers(state: DrawerState, open: boolean): void {
  for (const trigger of document.querySelectorAll<HTMLElement>(
    `[data-rb-drawer-trigger][data-rb-drawer-target="${CSS.escape(state.panel.id)}"]`,
  )) {
    trigger.setAttribute("aria-expanded", String(open));
  }
}

function isTriggerFor(target: Node, state: DrawerState): boolean {
  if (!(target instanceof Element)) return false;
  const trigger = target.closest<HTMLElement>("[data-rb-drawer-trigger]");
  return trigger ? drawerForTrigger(trigger) === state : false;
}

function drawerForTrigger(trigger: HTMLElement): DrawerState | undefined {
  const target = trigger.dataset.rbDrawerTarget;
  return target ? states.get(target) : undefined;
}

function stateForDrawer(drawer: HTMLElement): DrawerState | undefined {
  for (const state of states.values()) {
    if (state.drawer === drawer) return state;
  }
  return undefined;
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const trigger = target.closest<HTMLElement>("[data-rb-drawer-trigger]");
  if (trigger) {
    const state = drawerForTrigger(trigger);
    if (!state) return;
    event.preventDefault();
    setOpen(state, state.drawer.dataset.rbDrawerOpen !== "true");
    return;
  }

  if (target.closest("[data-rb-drawer-backdrop]")) {
    const drawer = target.closest<HTMLElement>("[data-rb-drawer]");
    const state = drawer ? stateForDrawer(drawer) : undefined;
    if (state) setOpen(state, false);
    return;
  }

  for (const state of [...openStates]) {
    if (!state.drawer.contains(target)) continue;
    if (target.closest("a[href]")) setOpen(state, false);
    return;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const target = event.target;
  if (
    event.key === " " &&
    target instanceof Element &&
    target.closest("[data-rb-drawer-trigger]")
  ) {
    event.preventDefault();
    target.closest<HTMLElement>("[data-rb-drawer-trigger]")?.click();
    return;
  }

  const state = openStates.at(-1);
  if (!state) return;
  if (getComputedStyle(state.panel).position !== "fixed") return;

  trapFocus(event, state.panel);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrawers, { once: true });
  } else {
    initDrawers();
  }
}
