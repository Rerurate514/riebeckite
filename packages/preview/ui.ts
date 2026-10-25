import { createPreviewDocument } from "./src/document.js";
import {
  createPreviewUiController,
  type PreviewUiInput,
  type PreviewUiResponse,
  type PreviewUiState,
  type PreviewUiTransport,
} from "./src/ui-controller.js";

export {
  type CreatePreviewUiControllerOptions,
  createPreviewSessionTransport,
  createPreviewUiController,
  type PreviewUiController,
  type PreviewUiDiagnostic,
  type PreviewUiInput,
  type PreviewUiResponse,
  type PreviewUiState,
  type PreviewUiTransport,
} from "./src/ui-controller.js";

export type PreviewUiSelectors = {
  readonly root: string;
  readonly markdown: string;
  readonly fixture: string;
  readonly page: string;
  readonly frame: string;
  readonly theme: string;
  readonly mode: string;
  readonly status: string;
  readonly diagnostics: string;
  readonly option: string;
};

export type PreviewUiMessages = {
  readonly rendering: string;
  readonly rendered: string;
  readonly checkDiagnostics: string;
  readonly requestFailure: string;
};

export type PreviewUiOptions = {
  readonly themeStyles: Readonly<Record<string, string>>;
  readonly themeAttributes?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly contentStyles?: readonly string[];
  readonly pluginStyles: readonly string[];
  readonly endpoint?: string;
  readonly transport?: PreviewUiTransport;
  readonly selectors?: Partial<PreviewUiSelectors>;
  readonly messages?: Partial<PreviewUiMessages>;
};

const defaultSelectors: PreviewUiSelectors = {
  root: "[data-plugin-preview]",
  markdown: "[data-preview-markdown]",
  fixture: "[data-preview-fixture-select]",
  page: "[data-preview-page-select]",
  frame: "[data-preview-frame]",
  theme: "[data-preview-theme]",
  mode: "[data-preview-mode]",
  status: "[data-preview-status]",
  diagnostics: "[data-preview-diagnostics]",
  option: "[data-preview-option]",
};

const defaultMessages: PreviewUiMessages = {
  rendering: "Rendering",
  rendered: "Rendered",
  checkDiagnostics: "Check diagnostics",
  requestFailure: "The preview could not be rendered. Try again.",
};

export function initPluginPreviews(options: PreviewUiOptions): () => void {
  const selectors = { ...defaultSelectors, ...options.selectors };
  const messages = { ...defaultMessages, ...options.messages };
  const mounts = new Map<HTMLElement, () => void>();
  const initializeRoots = () => {
    document.querySelectorAll<HTMLElement>(selectors.root).forEach((root) => {
      if (!mounts.has(root)) {
        mounts.set(root, mountPreview(root, options, selectors, messages));
      }
    });
    for (const [root, dispose] of mounts) {
      if (!root.isConnected) {
        dispose();
        mounts.delete(root);
      }
    }
  };
  initializeRoots();
  const observer = new MutationObserver(initializeRoots);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    for (const dispose of mounts.values()) dispose();
    mounts.clear();
  };
}

export function mountPreview(
  root: HTMLElement,
  options: PreviewUiOptions,
  providedSelectors?: PreviewUiSelectors,
  providedMessages?: PreviewUiMessages,
): () => void {
  const selectors = providedSelectors ?? {
    ...defaultSelectors,
    ...options.selectors,
  };
  const messages = providedMessages ?? {
    ...defaultMessages,
    ...options.messages,
  };
  const lifetime = new AbortController();
  const markdown = requireElement<HTMLTextAreaElement>(
    root,
    selectors.markdown,
  );
  const fixture = requireElement<HTMLSelectElement>(root, selectors.fixture);
  const frame = requireElement<HTMLIFrameElement>(root, selectors.frame);
  frame.setAttribute("sandbox", "");
  const theme = requireElement<HTMLSelectElement>(root, selectors.theme);
  const mode = requireElement<HTMLSelectElement>(root, selectors.mode);
  const status = requireElement(root, selectors.status);
  const diagnostics = requireElement<HTMLUListElement>(
    root,
    selectors.diagnostics,
  );
  let lastResponse: PreviewUiResponse | undefined;
  const elements: PreviewElements = {
    frame,
    theme,
    mode,
    status,
    diagnostics,
    themeStyles: options.themeStyles,
    themeAttributes: options.themeAttributes ?? {},
    contentStyles: options.contentStyles ?? [],
    pluginStyles: options.pluginStyles,
    messages,
  };
  const controller = createPreviewUiController({
    request:
      options.transport ??
      ((input, signal) =>
        requestPreview(
          input,
          signal,
          messages.requestFailure,
          options.endpoint,
        )),
    onStateChange: (state) => {
      if (state.kind === "rendered") lastResponse = state.response;
      renderState(state, elements);
    },
  });
  const render = () => {
    void controller.render(readInput(root, markdown, fixture, selectors));
  };

  root.addEventListener("input", render, { signal: lifetime.signal });
  root.addEventListener(
    "change",
    (event) => {
      if (event.target === fixture) {
        const value = readFixtureMarkdown(root, fixture.value);
        if (value !== undefined) markdown.value = value;
        updatePageSelect(root, selectors.page, fixture.value);
      }
      if (
        event.target instanceof HTMLSelectElement &&
        event.target.matches(selectors.page)
      ) {
        const value = readPageMarkdown(root, fixture.value, event.target.value);
        if (value !== undefined) markdown.value = value;
      }
      if ((event.target === theme || event.target === mode) && lastResponse) {
        renderState({ kind: "rendered", response: lastResponse }, elements);
      } else {
        render();
      }
    },
    { signal: lifetime.signal },
  );
  render();
  return () => {
    controller.dispose();
    lifetime.abort();
  };
}

function readPageMarkdown(
  root: HTMLElement,
  fixtureId: string,
  pageId: string,
): string | undefined {
  return readFixturePages(root.dataset.previewPages, fixtureId)?.pages.find(
    (page) => page.id === pageId,
  )?.markdown;
}

type PreviewElements = {
  readonly frame: HTMLIFrameElement;
  readonly theme: HTMLSelectElement;
  readonly mode: HTMLSelectElement;
  readonly status: HTMLElement;
  readonly diagnostics: HTMLUListElement;
  readonly themeStyles: Readonly<Record<string, string>>;
  readonly themeAttributes: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly contentStyles: readonly string[];
  readonly pluginStyles: readonly string[];
  readonly messages: PreviewUiMessages;
};

function renderState(state: PreviewUiState, elements: PreviewElements): void {
  if (state.kind === "rendering") {
    elements.status.textContent = elements.messages.rendering;
    return;
  }
  const themeStyle = elements.themeStyles[elements.theme.value];
  elements.frame.srcdoc = createPreviewDocument({
    html: state.response.html,
    styles: [
      themeStyle ?? elements.themeStyles.default ?? "",
      ...elements.contentStyles,
      ...elements.pluginStyles,
    ],
    themeName:
      elements.theme.value === "default" ? "riebeckite" : elements.theme.value,
    colorMode:
      elements.mode.value === "dark" || elements.mode.value === "system"
        ? elements.mode.value
        : "light",
    themeAttributes: elements.themeAttributes[elements.theme.value],
  });
  elements.diagnostics.replaceChildren(
    ...state.response.diagnostics.map((diagnostic) => {
      const item = document.createElement("li");
      item.dataset.severity = diagnostic.severity;
      item.textContent = diagnostic.message;
      return item;
    }),
  );
  elements.status.textContent = state.response.diagnostics.some(
    (item) => item.severity === "error",
  )
    ? elements.messages.checkDiagnostics
    : elements.messages.rendered;
}

function readInput(
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

function readPageId(root: HTMLElement, selector: string): string | undefined {
  const page = root.querySelector<HTMLSelectElement>(selector);
  return page && !page.closest("label")?.hidden
    ? page.value || undefined
    : undefined;
}

type FixturePages = {
  readonly currentPageId?: string;
  readonly pages: readonly FixturePage[];
};

type FixturePage = {
  readonly id: string;
  readonly title: string;
  readonly markdown: string;
};

function updatePageSelect(
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

function readFixtureMarkdown(
  root: HTMLElement,
  fixtureId: string,
): string | undefined {
  return readSerializedMarkdown(root.dataset.previewFixtures, fixtureId);
}

function readSerializedMarkdown(
  serialized: string | undefined,
  id: string,
): string | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[id];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function readFixturePages(
  serialized: string | undefined,
  fixtureId: string,
): FixturePages | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[fixtureId];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    if (!Array.isArray(record.pages)) return undefined;
    const pages = record.pages.flatMap((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return [];
      const item = page as Record<string, unknown>;
      return typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.markdown === "string"
        ? [{ id: item.id, title: item.title, markdown: item.markdown }]
        : [];
    });
    if (pages.length !== record.pages.length) return undefined;
    return {
      pages,
      ...(typeof record.currentPageId === "string"
        ? { currentPageId: record.currentPageId }
        : {}),
    };
  } catch {
    return undefined;
  }
}

function readOptions(
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

async function requestPreview(
  input: PreviewUiInput,
  signal: AbortSignal,
  requestFailure: string,
  endpoint = "/api/playground",
): Promise<PreviewUiResponse | undefined> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new Error("Preview request failed.");
    return (await response.json()) as PreviewUiResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return undefined;
    }
    return {
      html: "",
      diagnostics: [{ severity: "error", message: requestFailure }],
    };
  }
}

function requireElement<Element extends HTMLElement>(
  root: HTMLElement,
  selector: string,
): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing preview element: ${selector}`);
  return element as Element;
}
