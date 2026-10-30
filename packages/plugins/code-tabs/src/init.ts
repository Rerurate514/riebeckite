import { createTabs, type TabsController } from "@riebeckite/ui/tabs";
import type { CodeTabsClientOptions } from "./types.js";

const SELECTOR = "[data-code-tabs='true']";
const TAB_SELECTOR = "[data-code-tabs-tab='true']";

const controllers = new WeakMap<HTMLElement, TabsController>();

export function initCodeTabs(options: CodeTabsClientOptions = {}) {
  for (const group of getGroups()) {
    if (controllers.has(group)) continue;

    const tablist = group.querySelector<HTMLElement>('[role="tablist"]');
    if (!tablist) continue;

    controllers.set(
      group,
      createTabs(tablist, {
        onSelect: ({ tab }) => {
          if (options.syncTabs !== true) return;
          if (group.dataset.codeTabsSync !== "true") return;
          const label = tab.dataset.codeTabsLabel;
          if (label) syncGroups(group, label);
        },
      }),
    );
  }
}

function syncGroups(group: HTMLElement, label: string): void {
  for (const otherGroup of getGroups()) {
    if (otherGroup === group || otherGroup.dataset.codeTabsSync !== "true") {
      continue;
    }

    const index = getTabs(otherGroup).findIndex(
      (tab) => tab.dataset.codeTabsLabel === label,
    );
    if (index >= 0) {
      controllers.get(otherGroup)?.select(index, {
        focus: false,
        notify: false,
      });
    }
  }
}

function getGroups(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
}

function getTabs(group: HTMLElement): HTMLButtonElement[] {
  return Array.from(group.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR));
}
