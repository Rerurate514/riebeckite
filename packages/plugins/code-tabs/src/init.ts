import type { CodeTabsClientOptions } from "./types.js";

const SELECTOR = "[data-code-tabs='true']";
const TAB_SELECTOR = "[data-code-tabs-tab='true']";
const PANEL_SELECTOR = "[data-code-tabs-panel='true']";

export function initCodeTabs(options: CodeTabsClientOptions = {}) {
  const groups = getGroups();
  for (const group of groups) initializeGroup(group, options);
}

function initializeGroup(group: HTMLElement, options: CodeTabsClientOptions) {
  const tabs = getTabs(group);
  const panels = getPanels(group);
  if (tabs.length === 0 || panels.length === 0) return;

  const initialIndex = tabs.findIndex(
    (tab) => tab.getAttribute("aria-selected") === "true",
  );
  activateTab(group, Math.max(initialIndex, 0), { focus: false, sync: false });

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => {
      activateTab(group, index, {
        focus: true,
        sync: options.syncTabs === true,
      });
    });
    tab.addEventListener("keydown", (event) => {
      const nextIndex = getKeyboardTargetIndex(event, index, tabs.length);
      if (nextIndex === null) return;

      event.preventDefault();
      activateTab(group, nextIndex, {
        focus: true,
        sync: options.syncTabs === true,
      });
    });
  }
}

function activateTab(
  group: HTMLElement,
  index: number,
  behavior: { focus: boolean; sync: boolean },
) {
  const tabs = getTabs(group);
  const panels = getPanels(group);
  const selectedTab = tabs[index];
  if (!selectedTab) return;

  for (const [tabIndex, tab] of tabs.entries()) {
    const selected = tabIndex === index;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  }

  for (const [panelIndex, panel] of panels.entries()) {
    const selected = panelIndex === index;
    panel.dataset.active = selected ? "true" : "false";
    panel.hidden = !selected;
  }

  if (behavior.focus) selectedTab.focus();
  if (!behavior.sync || group.dataset.codeTabsSync !== "true") return;

  const label = selectedTab.dataset.codeTabsLabel;
  if (!label) return;

  for (const otherGroup of getGroups()) {
    if (otherGroup === group || otherGroup.dataset.codeTabsSync !== "true")
      continue;
    const otherIndex = getTabs(otherGroup).findIndex(
      (tab) => tab.dataset.codeTabsLabel === label,
    );
    if (otherIndex >= 0) {
      activateTab(otherGroup, otherIndex, { focus: false, sync: false });
    }
  }
}

function getKeyboardTargetIndex(
  event: KeyboardEvent,
  currentIndex: number,
  total: number,
): number | null {
  if (event.key === "ArrowLeft") return (currentIndex + total - 1) % total;
  if (event.key === "ArrowRight") return (currentIndex + 1) % total;
  if (event.key === "Home") return 0;
  if (event.key === "End") return total - 1;
  if (event.key === "Enter" || event.key === " ") return currentIndex;
  return null;
}

function getGroups(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
}

function getTabs(group: HTMLElement): HTMLButtonElement[] {
  return Array.from(group.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR));
}

function getPanels(group: HTMLElement): HTMLElement[] {
  return Array.from(group.querySelectorAll<HTMLElement>(PANEL_SELECTOR));
}
