import { hydrateRoot } from "hono/jsx/dom/client";
import { CodeTabsGroup, type CodeTabsGroupProps } from "./src/tabs.js";

const ROOT_SELECTOR = "[data-code-tabs='true']";
const PROPS_ATTRIBUTE = "data-code-tabs-props";

export function initCodeTabs(): (() => void) | undefined {
  const roots: Array<ReturnType<typeof hydrateRoot>> = [];
  for (const element of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    const props = parseProps(element.getAttribute(PROPS_ATTRIBUTE));
    if (props) roots.push(hydrateRoot(element, <CodeTabsGroup {...props} />));
  }
  if (roots.length === 0) return undefined;
  return () => {
    for (const root of roots) root.unmount();
  };
}

function parseProps(value: string | null): CodeTabsGroupProps | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CodeTabsGroupProps;
    return typeof parsed.groupId === "string" && Array.isArray(parsed.tabs)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
