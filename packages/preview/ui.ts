import { createPreviewDocument } from "./src/document.js";
import {
  createPreviewUiController,
  type PreviewUiInput,
  type PreviewUiResponse,
  type PreviewUiState,
} from "./src/ui-controller.js";

export {
  type CreatePreviewUiControllerOptions,
  createPreviewUiController,
  type PreviewUiController,
  type PreviewUiDiagnostic,
  type PreviewUiInput,
  type PreviewUiResponse,
  type PreviewUiState,
} from "./src/ui-controller.js";

export type PreviewUiSelectors = {
  readonly root: string;
  readonly markdown: string;
  readonly fixture: string;
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
  readonly pluginStyles: readonly string[];
  readonly endpoint?: string;
  readonly selectors?: Partial<PreviewUiSelectors>;
  readonly messages?: Partial<PreviewUiMessages>;
};

const defaultSelectors: PreviewUiSelectors = {
  root: "[data-plugin-preview]",
  markdown: "[data-preview-markdown]",
  fixture: "[data-preview-fixture-select]",
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

const controllers = new WeakMap<HTMLElement, () => void>();
const roots = new Set<HTMLElement>();
let observer: MutationObserver | undefined;

export function initPluginPreviews(options: PreviewUiOptions): void {
  const selectors = { ...defaultSelectors, ...options.selectors };
  const messages = { ...defaultMessages, ...options.messages };
  document.querySelectorAll<HTMLElement>(selectors.root).forEach((root) => {
    initialize(root, options, selectors, messages);
  });
  if (observer) return;
  observer = new MutationObserver(() => {
    document.querySelectorAll<HTMLElement>(selectors.root).forEach((root) => {
      initialize(root, options, selectors, messages);
    });
    for (const root of roots) {
      if (!root.isConnected) controllers.get(root)?.();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function initialize(
  root: HTMLElement,
  options: PreviewUiOptions,
  selectors: PreviewUiSelectors,
  messages: PreviewUiMessages,
): void {
  if (controllers.has(root)) return;
  roots.add(root);
  const lifetime = new AbortController();
  const markdown = requireElement<HTMLTextAreaElement>(
    root,
    selectors.markdown,
  );
  const fixture = requireElement<HTMLSelectElement>(root, selectors.fixture);
  const frame = requireElement<HTMLIFrameElement>(root, selectors.frame);
  const theme = requireElement<HTMLSelectElement>(root, selectors.theme);
  const mode = requireElement<HTMLSelectElement>(root, selectors.mode);
  const status = requireElement(root, selectors.status);
  const diagnostics = requireElement<HTMLUListElement>(
    root,
    selectors.diagnostics,
  );
  const controller = createPreviewUiController({
    request: (input, signal) =>
      requestPreview(input, signal, messages.requestFailure, options.endpoint),
    onStateChange: (state) => {
      renderState(state, {
        frame,
        theme,
        mode,
        status,
        diagnostics,
        themeStyles: options.themeStyles,
        pluginStyles: options.pluginStyles,
        messages,
      });
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
      }
      render();
    },
    { signal: lifetime.signal },
  );
  controllers.set(root, () => {
    controller.dispose();
    lifetime.abort();
    controllers.delete(root);
    roots.delete(root);
  });
  render();
}

type PreviewElements = {
  readonly frame: HTMLIFrameElement;
  readonly theme: HTMLSelectElement;
  readonly mode: HTMLSelectElement;
  readonly status: HTMLElement;
  readonly diagnostics: HTMLUListElement;
  readonly themeStyles: Readonly<Record<string, string>>;
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
      ...elements.pluginStyles,
    ],
    themeName:
      elements.theme.value === "default" ? "riebeckite" : elements.theme.value,
    colorMode: elements.mode.value === "dark" ? "dark" : "light",
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
    options: readOptions(root, selectors.option),
  };
}

function readFixtureMarkdown(
  root: HTMLElement,
  fixtureId: string,
): string | undefined {
  const fixtures = root.dataset.previewFixtures;
  if (!fixtures) return undefined;
  try {
    const parsed: unknown = JSON.parse(fixtures);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[fixtureId];
    return typeof value === "string" ? value : undefined;
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
