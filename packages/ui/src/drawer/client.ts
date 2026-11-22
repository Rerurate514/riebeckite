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

export type DrawerInitOptions = {
  readonly signal?: AbortSignal;
};

type DrawerRuntime = {
  readonly states: WeakMap<HTMLElement, DrawerState>;
  readonly open: DrawerState[];
  readonly controller: AbortController;
  readonly observer: MutationObserver;
};

let runtime: DrawerRuntime | null = null;

export function initDrawers(options: DrawerInitOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};
  if (runtime) {
    return () => {
      if (runtime) destroy(runtime);
    };
  }

  const controller = new AbortController();
  const observer = new MutationObserver((records) => {
    const current = runtime;
    if (!current) return;
    let navigated = false;
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (
          node instanceof Element &&
          (node.matches("main#main-content") ||
            node.querySelector("main#main-content"))
        ) {
          navigated = true;
        }
      }
      for (const node of record.addedNodes) adopt(current, node);
    }
    for (const state of [...current.open]) {
      if (navigated || !state.drawer.isConnected) {
        setOpen(current, state, false, false);
      }
    }
  });
  const current: DrawerRuntime = {
    states: new WeakMap(),
    open: [],
    controller,
    observer,
  };
  runtime = current;

  document.addEventListener("click", onClick, { signal: controller.signal });
  document.addEventListener("keydown", onKeyDown, {
    signal: controller.signal,
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  for (const drawer of document.querySelectorAll<HTMLElement>(
    "[data-rb-drawer]",
  )) {
    const state = drawerState(current, drawer);
    if (state?.panel.matches(":target")) setOpen(current, state, true, false);
  }

  if (options.signal) {
    if (options.signal.aborted) destroy(current);
    else
      options.signal.addEventListener("abort", () => destroy(current), {
        once: true,
      });
  }

  return () => destroy(current);
}

function destroy(current: DrawerRuntime): void {
  if (runtime !== current) return;
  runtime = null;
  current.observer.disconnect();
  current.controller.abort();
  for (const state of [...current.open]) setOpen(current, state, false, false);
}

function drawerState(
  current: DrawerRuntime,
  drawer: HTMLElement,
): DrawerState | undefined {
  const existing = current.states.get(drawer);
  if (existing) return existing;

  const panel = drawer.querySelector<HTMLElement>("[data-rb-drawer-panel]");
  if (!panel?.id) return undefined;

  const state: DrawerState = {
    drawer,
    panel,
    backdrop: drawer.querySelector<HTMLElement>("[data-rb-drawer-backdrop]"),
    returnFocus: null,
  };
  current.states.set(drawer, state);
  return state;
}

function triggerState(
  current: DrawerRuntime,
  trigger: HTMLElement,
): DrawerState | undefined {
  const target = trigger.dataset.rbDrawerTarget;
  if (!target) return undefined;

  const panel = document.getElementById(target);
  if (!(panel instanceof HTMLElement)) return undefined;
  if (!panel.hasAttribute("data-rb-drawer-panel")) return undefined;

  const drawer = panel.closest<HTMLElement>("[data-rb-drawer]");
  return drawer ? drawerState(current, drawer) : undefined;
}

function adopt(current: DrawerRuntime, node: Node): void {
  if (!(node instanceof Element)) return;
  const drawers = node.matches("[data-rb-drawer]")
    ? [node]
    : [...node.querySelectorAll<HTMLElement>("[data-rb-drawer]")];
  for (const drawer of drawers) {
    if (!(drawer instanceof HTMLElement)) continue;
    const state = drawerState(current, drawer);
    if (state?.panel.matches(":target")) setOpen(current, state, true, false);
  }
}

function setOpen(
  current: DrawerRuntime,
  state: DrawerState,
  open: boolean,
  restoreFocus = true,
): void {
  if (open) {
    for (const other of [...current.open]) {
      if (other !== state) setOpen(current, other, false, false);
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

    if (!current.open.includes(state)) current.open.push(state);
    state.releaseDismiss ??= createDismissable({
      dismiss: () => setOpen(current, state, false),
      contains: (target) =>
        state.drawer.contains(target) || isTriggerFor(current, target, state),
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

  const index = current.open.indexOf(state);
  if (index >= 0) current.open.splice(index, 1);
  state.releaseDismiss?.();
  state.releaseDismiss = undefined;
  state.releaseScroll?.();
  state.releaseScroll = undefined;

  syncTriggers(state, false);
  if (restoreFocus && state.returnFocus?.isConnected) state.returnFocus.focus();
  state.returnFocus = null;
}

function syncTriggers(state: DrawerState, open: boolean): void {
  for (const trigger of document.querySelectorAll<HTMLElement>(
    `[data-rb-drawer-trigger][data-rb-drawer-target="${CSS.escape(state.panel.id)}"]`,
  )) {
    trigger.setAttribute("aria-expanded", String(open));
  }
}

function isTriggerFor(
  current: DrawerRuntime,
  target: Node,
  state: DrawerState,
): boolean {
  if (!(target instanceof Element)) return false;
  const trigger = target.closest<HTMLElement>("[data-rb-drawer-trigger]");
  return trigger ? triggerState(current, trigger) === state : false;
}

function onClick(event: MouseEvent): void {
  const current = runtime;
  if (!current) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const trigger = target.closest<HTMLElement>("[data-rb-drawer-trigger]");
  if (trigger) {
    const state = triggerState(current, trigger);
    if (!state) return;
    event.preventDefault();
    setOpen(current, state, state.drawer.dataset.rbDrawerOpen !== "true");
    return;
  }

  if (target.closest("[data-rb-drawer-backdrop]")) {
    const drawer = target.closest<HTMLElement>("[data-rb-drawer]");
    const state = drawer ? drawerState(current, drawer) : undefined;
    if (state) setOpen(current, state, false);
    return;
  }

  for (const state of [...current.open]) {
    if (!state.drawer.contains(target)) continue;
    if (target.closest("a[href]")) setOpen(current, state, false);
    return;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const current = runtime;
  if (!current) return;

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

  const state = current.open.at(-1);
  if (!state) return;
  if (getComputedStyle(state.panel).position !== "fixed") return;

  trapFocus(event, state.panel);
}
