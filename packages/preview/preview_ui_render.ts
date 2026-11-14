import type { PreviewElements } from "./preview_ui_types.js";
import { createPreviewDocument } from "./src/document.js";
import type { PreviewUiState } from "./src/ui-controller.js";

export function renderState(
  state: PreviewUiState,
  elements: PreviewElements,
): void {
  elements.frameRevision += 1;
  if (state.kind === "rendering") {
    elements.loading.start();
    elements.status.textContent = elements.messages.rendering;
    return;
  }
  const revision = elements.frameRevision;
  elements.loading.start();
  const themeStyle = elements.themeStyles[elements.theme.value];
  const themeSettings = elements.themeSettings?.(elements.theme.value);
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
    articleTitle: elements.articleTitle,
    themeSettingsStyle: themeSettings?.style,
    themeAttributes:
      themeSettings?.attributes ??
      elements.themeAttributes[elements.theme.value],
  });
  elements.diagnostics.replaceChildren(
    ...state.response.diagnostics.map((diagnostic) => {
      const item = document.createElement("li");
      item.dataset.severity = diagnostic.severity;
      item.textContent = diagnostic.message;
      return item;
    }),
  );
  const settle = () => {
    if (revision !== elements.frameRevision) return;
    elements.loading.stop();
    elements.status.textContent = state.response.diagnostics.some(
      (item) => item.severity === "error",
    )
      ? elements.messages.checkDiagnostics
      : elements.messages.rendered;
  };
  if (state.response.html.length === 0) {
    settle();
    return;
  }
  elements.frame.addEventListener("load", settle, { once: true });
}

export function isThemeSettingEvent(event: Event): boolean {
  return (
    event.target instanceof Element &&
    event.target.closest("[data-preview-theme-settings]") !== null
  );
}

export function updateThemeSettings(elements: PreviewElements): void {
  const document = elements.frame.contentDocument;
  const settings = elements.themeSettings?.(elements.theme.value);
  if (!document || !settings) return;
  for (const element of document.querySelectorAll(":root, .rb-theme-root")) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("data-rb-setting-"))
        element.removeAttribute(attribute.name);
    }
    for (const [name, value] of Object.entries(settings.attributes))
      element.setAttribute(name, value);
  }
  const style = document.querySelector<HTMLStyleElement>(
    "style[data-rb-preview-theme-settings]",
  );
  if (style) style.textContent = settings.style;
}
