import { createLoadingController } from "@riebeckite/ui/loading";
import {
  readFixtureMarkdown,
  readPageMarkdown,
} from "./preview_ui_fixtures.js";
import { readInput, updatePageSelect } from "./preview_ui_inputs.js";
import {
  isThemeSettingEvent,
  updateThemeSettings,
} from "./preview_ui_render.js";
import type { PreviewElements } from "./preview_ui_types.js";
import { mountThemePreview as mountThemePreviewImplementation } from "./src/theme-preview.js";
import {
  createPreviewUiController,
  type PreviewUiResponse,
} from "./src/ui-controller.js";
import type {
  PreviewUiMessages,
  PreviewUiOptions,
  PreviewUiSelectors,
} from "./src/ui-types.js";

export type {
  ThemePreviewOptions,
  ThemePreviewTheme,
} from "./src/theme-preview.js";
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
export type {
  PreviewUiMessages,
  PreviewUiOptions,
  PreviewUiSelectors,
} from "./src/ui-types.js";

import { requireElement } from "./preview_ui_inputs.js";
import { renderState } from "./preview_ui_render.js";
import { requestPreview } from "./preview_ui_request.js";
import { defaultMessages, defaultSelectors } from "./preview_ui_types.js";

export function mountThemePreview(
  root: HTMLElement,
  options: import("./src/theme-preview.js").ThemePreviewOptions,
): () => void {
  return mountThemePreviewImplementation(root, options, mountPreview);
}

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
  const loading = createLoadingController(root, { signal: lifetime.signal });
  const markdown = requireElement<HTMLTextAreaElement>(
    root,
    selectors.markdown,
  );
  const fixture = requireElement<HTMLSelectElement>(root, selectors.fixture);
  const frame = requireElement<HTMLIFrameElement>(root, selectors.frame);
  frame.setAttribute("sandbox", "allow-same-origin");
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
    loading,
    frameRevision: 0,
    themeStyles: options.themeStyles,
    themeAttributes: options.themeAttributes ?? {},
    themeSettings: options.themeSettings,
    articleTitle: options.articleTitle,
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

  root.addEventListener(
    "input",
    (event) => {
      if (isThemeSettingEvent(event)) {
        updateThemeSettings(elements);
        return;
      }
      render();
    },
    { signal: lifetime.signal },
  );
  root.addEventListener(
    "change",
    (event) => {
      if (isThemeSettingEvent(event)) {
        updateThemeSettings(elements);
        return;
      }
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
        renderState({ kind: "rendering" }, elements);
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
