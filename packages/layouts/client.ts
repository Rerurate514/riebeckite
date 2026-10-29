const focusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

type DrawerState = {
  readonly drawer: HTMLElement;
  readonly panel: HTMLElement;
  readonly backdrop: HTMLElement | null;
  returnFocus: HTMLElement | null;
};

const states = new Map<string, DrawerState>();
const openStates = new Set<DrawerState>();
let listening = false;

export function initDrawers(): void {
  if (!listening) {
    listening = true;
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("spa:navigation", () => {
      closeAll(false);
      initDrawers();
    });
  }

  for (const key of states.keys()) {
    if (!states.get(key)?.drawer.isConnected) states.delete(key);
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
    for (const other of [...openStates])
      if (other !== state) setOpen(other, false, false);
    if (!state.panel.isConnected) return;
    state.returnFocus = document.activeElement as HTMLElement | null;
    state.drawer.dataset.rbDrawerOpen = "true";
    const overlay = getComputedStyle(state.panel).position === "fixed";
    if (overlay) {
      if (state.backdrop) state.backdrop.hidden = false;
      state.panel.setAttribute("role", "dialog");
      state.panel.setAttribute("aria-modal", "true");
      document.documentElement.classList.add("rb-drawer-open");
    }
    openStates.add(state);
    syncTriggers(state, true);
    const focusTarget =
      state.panel.querySelector<HTMLElement>(focusableSelector);
    if (focusTarget) focusTarget.focus();
    else state.panel.focus();
    return;
  }

  state.drawer.dataset.rbDrawerOpen = "false";
  if (state.backdrop) state.backdrop.hidden = true;
  if (location.hash === `#${state.panel.id}`)
    history.replaceState(null, "", location.pathname + location.search);
  state.panel.removeAttribute("role");
  state.panel.removeAttribute("aria-modal");
  openStates.delete(state);
  if (openStates.size === 0)
    document.documentElement.classList.remove("rb-drawer-open");
  syncTriggers(state, false);
  if (restoreFocus && state.returnFocus?.isConnected) state.returnFocus.focus();
  state.returnFocus = null;
}

function closeAll(restoreFocus: boolean): void {
  for (const state of [...openStates]) setOpen(state, false, restoreFocus);
}

function syncTriggers(state: DrawerState, open: boolean): void {
  for (const trigger of document.querySelectorAll<HTMLElement>(
    `[data-rb-drawer-trigger][data-rb-drawer-target="${CSS.escape(state.panel.id)}"]`,
  )) {
    trigger.setAttribute("aria-expanded", String(open));
  }
}

function drawerForTrigger(trigger: HTMLElement): DrawerState | undefined {
  const target = trigger.dataset.rbDrawerTarget;
  return target ? states.get(target) : undefined;
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
  if (openStates.size === 0) return;
  for (const state of [...openStates]) {
    if (state.drawer.contains(target)) {
      if (target.closest("a[href]")) setOpen(state, false);
      return;
    }
    setOpen(state, false);
  }
}

function stateForDrawer(drawer: HTMLElement): DrawerState | undefined {
  for (const state of states.values())
    if (state.drawer === drawer) return state;
  return undefined;
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
  const state = [...openStates].at(-1);
  if (!state) return;
  if (event.key === "Escape") {
    event.preventDefault();
    setOpen(state, false);
    return;
  }
  if (event.key !== "Tab") return;
  if (getComputedStyle(state.panel).position !== "fixed") return;
  const focusable = Array.from(
    state.panel.querySelectorAll<HTMLElement>(focusableSelector),
  );
  if (focusable.length === 0) {
    event.preventDefault();
    state.panel.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initDrawers, { once: true });
else initDrawers();
