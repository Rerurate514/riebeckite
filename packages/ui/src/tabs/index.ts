export type TabsSelection = {
  readonly index: number;
  readonly tab: HTMLElement;
  readonly panel: HTMLElement | undefined;
};

export type TabsControllerOptions = {
  readonly onSelect?: (selection: TabsSelection) => void;
};

export type TabsSelectOptions = {
  readonly focus?: boolean;
  readonly notify?: boolean;
};

export type TabsController = {
  readonly tablist: HTMLElement;
  select: (index: number, options?: TabsSelectOptions) => void;
  destroy: () => void;
};

const controllers = new WeakMap<HTMLElement, TabsController>();

export function createTabs(
  tablist: HTMLElement,
  options: TabsControllerOptions = {},
): TabsController {
  const existing = controllers.get(tablist);
  if (existing) return existing;

  const tabs = Array.from(
    tablist.querySelectorAll<HTMLElement>('[role="tab"]'),
  );
  const document = tablist.ownerDocument;
  const panels = tabs.map((tab) => {
    const id = tab.getAttribute("aria-controls");
    return id ? (document.getElementById(id) ?? undefined) : undefined;
  });

  const select = (index: number, behavior: TabsSelectOptions = {}) => {
    const selectedTab = tabs[index];
    if (!selectedTab) return;

    for (const [tabIndex, tab] of tabs.entries()) {
      const selected = tabIndex === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const [panelIndex, panel] of panels.entries()) {
      if (!panel) continue;
      const selected = panelIndex === index;
      panel.hidden = !selected;
      panel.dataset.active = String(selected);
    }

    if (behavior.focus) selectedTab.focus();
    if (behavior.notify === false) return;
    options.onSelect?.({ index, tab: selectedTab, panel: panels[index] });
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tab = target.closest<HTMLElement>('[role="tab"]');
    if (!tab || !tabs.includes(tab)) return;
    select(tabs.indexOf(tab), { focus: true });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const index = tabs.indexOf(target);
    if (index < 0) return;

    const vertical = tablist.getAttribute("aria-orientation") === "vertical";
    const previous = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";

    let nextIndex: number | null = null;
    if (event.key === previous) {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === next) {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === null) return;

    event.preventDefault();
    select(nextIndex, { focus: true });
  };

  tablist.addEventListener("click", onClick);
  tablist.addEventListener("keydown", onKeyDown);

  const initialIndex = Math.max(
    tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"),
    0,
  );
  select(initialIndex, { notify: false });

  const controller: TabsController = {
    tablist,
    select,
    destroy: () => {
      tablist.removeEventListener("click", onClick);
      tablist.removeEventListener("keydown", onKeyDown);
      controllers.delete(tablist);
    },
  };
  controllers.set(tablist, controller);
  return controller;
}
