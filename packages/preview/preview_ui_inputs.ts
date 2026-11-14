import { readFixturePages } from "./preview_ui_fixtures.js";
import type { PreviewUiInput } from "./src/ui-controller.js";
import type { PreviewUiSelectors } from "./src/ui-types.js";
export function readInput(
  root: HTMLElement,
  markdown: HTMLTextAreaElement,
  fixture: HTMLSelectElement,
  selectors: PreviewUiSelectors,
): PreviewUiInput {
  return {
    markdown: markdown.value,
    pluginId: root.dataset.previewPlugin,
    fixtureId: fixture.value,
    pageId: readPageId(root, selectors.page),
    options: readOptions(root, selectors.option),
  };
}

export function readPageId(
  root: HTMLElement,
  selector: string,
): string | undefined {
  const page = root.querySelector<HTMLSelectElement>(selector);
  return page && !page.closest("label")?.hidden
    ? page.value || undefined
    : undefined;
}

export function updatePageSelect(
  root: HTMLElement,
  selector: string,
  fixtureId: string,
): void {
  const select = root.querySelector<HTMLSelectElement>(selector);
  const label = select?.closest("label");
  if (!select || !label) return;
  const fixture = readFixturePages(root.dataset.previewPages, fixtureId);
  const pages = fixture?.pages ?? [];
  label.hidden = pages.length < 2;
  select.replaceChildren(
    ...pages.map((page) => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.title;
      option.selected = page.id === fixture?.currentPageId;
      return option;
    }),
  );
}

export function readOptions(
  root: HTMLElement,
  selector: string,
): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  root.querySelectorAll(selector).forEach((element) => {
    const input = element as HTMLInputElement | HTMLSelectElement;
    const name = input.dataset.previewOption;
    if (!name) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      options[name] = input.checked;
    } else if (input.type === "number") {
      if (input.value !== "") options[name] = Number(input.value);
    } else {
      options[name] = input.value;
    }
  });
  return options;
}

export function requireElement<Element extends HTMLElement>(
  root: HTMLElement,
  selector: string,
): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing preview element: ${selector}`);
  return element as Element;
}
