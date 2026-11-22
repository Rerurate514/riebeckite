import { hydrateRoot } from "hono/jsx/dom/client";
import { CodeTabsGroup, type CodeTabsGroupProps } from "./src/tabs.js";

const ROOT_SELECTOR = "[data-code-tabs='true']";
const PROPS_ATTRIBUTE = "data-code-tabs-props";
const PANEL_SELECTOR = "[data-code-tabs-panel]";

type IslandProps = {
  readonly groupId: string;
  readonly sync: boolean;
  readonly labels: readonly string[];
};

export function initCodeTabs(): (() => void) | undefined {
  const roots: Array<ReturnType<typeof hydrateRoot>> = [];
  for (const element of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    const island = parseIsland(element.getAttribute(PROPS_ATTRIBUTE));
    const props = island && readProps(element, island);
    if (props) roots.push(hydrateRoot(element, <CodeTabsGroup {...props} />));
  }
  if (roots.length === 0) return undefined;
  return () => {
    for (const root of roots) root.unmount();
  };
}

function readProps(
  element: HTMLElement,
  island: IslandProps,
): CodeTabsGroupProps | null {
  const panels = element.querySelectorAll<HTMLElement>(PANEL_SELECTOR);
  if (panels.length !== island.labels.length) return null;
  return {
    groupId: island.groupId,
    sync: island.sync,
    tabs: island.labels.map((label, index) => ({
      label,
      html: panels[index]?.innerHTML ?? "",
    })),
  };
}

function parseIsland(value: string | null): IslandProps | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as IslandProps;
    return typeof parsed.groupId === "string" && Array.isArray(parsed.labels)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
