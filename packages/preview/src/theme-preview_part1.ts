import {
  reflectThemeSettings,
  type ThemePreset,
  type ThemeSettingsSchema,
  validateThemeSettings,
} from "@riebeckite/core";
import { renderThemeSettings, required } from "./theme-preview_part2.js";
import type { PreviewUiOptions } from "./ui-types.js";

export type ThemePreviewTheme = {
  readonly id: string;
  readonly settings: ThemeSettingsSchema;
  readonly presets: Readonly<Record<string, ThemePreset<ThemeSettingsSchema>>>;
};

export type ThemePreviewOptions = PreviewUiOptions & {
  readonly themes: readonly ThemePreviewTheme[];
  readonly defaultTheme: string;
  readonly onThemeChange?: (themeId: string) => void;
  readonly configuration?: (
    themeId: string,
    settings: Readonly<Record<string, string | number | boolean>>,
    colorMode: string,
  ) => string;
  readonly configurationTarget?: HTMLElement;
};

export function mountThemePreview(
  root: HTMLElement,
  options: ThemePreviewOptions,
  mountPreview: (root: HTMLElement, options: PreviewUiOptions) => () => void,
): () => void {
  const values: Record<string, Record<string, string | number | boolean>> = {};
  const resolve = (themeId: string) => {
    const theme = options.themes.find((item) => item.id === themeId);
    if (!theme) return undefined;
    const configured = values[themeId] ?? {};
    return reflectThemeSettings(
      theme.settings,
      validateThemeSettings(theme.settings, configured),
      new Set(Object.keys(configured)),
    );
  };
  const disposePreview = mountPreview(root, {
    ...options,
    themeSettings: resolve,
  });
  const lifetime = new AbortController();
  const themeSelect = required<HTMLSelectElement>(root, "[data-preview-theme]");
  const mode = required<HTMLSelectElement>(root, "[data-preview-mode]");
  const fixture = required<HTMLSelectElement>(root, "[data-preview-fixture]");
  const viewport = required<HTMLElement>(root, "[data-preview-viewport]");
  const settings = required<HTMLElement>(root, "[data-preview-theme-settings]");
  const reset = root.querySelector<HTMLButtonElement>("[data-preview-reset]");
  const updateReset = () => {
    if (!reset) return;
    reset.hidden =
      themeSelect.value === options.defaultTheme &&
      mode.value === "system" &&
      fixture.selectedIndex === 0 &&
      viewport.dataset.previewViewport === "desktop" &&
      Object.values(values).every((value) => Object.keys(value).length === 0);
  };
  const selectTheme = () => {
    renderThemeSettings(
      settings,
      options.themes,
      themeSelect.value,
      values,
      resolve,
    );
    options.onThemeChange?.(themeSelect.value);
    updateConfiguration(root, options, values, themeSelect.value, mode.value);
  };
  themeSelect.addEventListener("change", selectTheme, {
    signal: lifetime.signal,
  });
  mode.addEventListener(
    "change",
    () =>
      updateConfiguration(root, options, values, themeSelect.value, mode.value),
    { signal: lifetime.signal },
  );
  settings.addEventListener(
    "input",
    () =>
      updateConfiguration(root, options, values, themeSelect.value, mode.value),
    { signal: lifetime.signal },
  );
  root.addEventListener("input", updateReset, { signal: lifetime.signal });
  root.addEventListener("change", updateReset, { signal: lifetime.signal });
  settings.addEventListener(
    "change",
    () =>
      updateConfiguration(root, options, values, themeSelect.value, mode.value),
    { signal: lifetime.signal },
  );
  const copyButton =
    options.configurationTarget
      ?.closest<HTMLElement>("[data-preview-configuration]")
      ?.querySelector<HTMLButtonElement>("[data-theme-copy]") ??
    options.configurationTarget?.parentElement?.querySelector<HTMLButtonElement>(
      "[data-theme-copy]",
    ) ??
    root.querySelector<HTMLButtonElement>("[data-theme-copy]");
  copyButton?.addEventListener(
    "click",
    () => {
      const code =
        options.configurationTarget?.textContent ??
        root.querySelector<HTMLElement>("[data-theme-detail-code]")
          ?.textContent ??
        "";
      if (!navigator.clipboard) return;
      void navigator.clipboard.writeText(code).then(
        () => {
          copyButton.textContent =
            copyButton.dataset.previewCopySuccess ?? copyButton.textContent;
        },
        () => {
          copyButton.textContent =
            copyButton.dataset.previewCopyFailure ?? copyButton.textContent;
        },
      );
    },
    { signal: lifetime.signal },
  );
  root
    .querySelectorAll<HTMLButtonElement>("[data-preview-device]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const device = button.dataset.previewDevice;
          if (!device) return;
          viewport.dataset.previewViewport = device;
          root
            .querySelectorAll<HTMLButtonElement>("[data-preview-device]")
            .forEach((item) => {
              item.setAttribute("aria-pressed", String(item === button));
            });
          updateReset();
        },
        { signal: lifetime.signal },
      );
    });
  reset?.addEventListener(
    "click",
    () => {
      for (const key of Object.keys(values)) delete values[key];
      themeSelect.value = options.defaultTheme;
      mode.value = "system";
      fixture.selectedIndex = 0;
      viewport.dataset.previewViewport = "desktop";
      root
        .querySelectorAll<HTMLButtonElement>("[data-preview-device]")
        .forEach((button, index) => {
          button.setAttribute("aria-pressed", String(index === 0));
        });
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      fixture.dispatchEvent(new Event("change", { bubbles: true }));
      updateReset();
    },
    { signal: lifetime.signal },
  );
  selectTheme();
  updateReset();
  return () => {
    lifetime.abort();
    disposePreview();
  };
}

export function updateConfiguration(
  root: HTMLElement,
  options: ThemePreviewOptions,
  values: Record<string, Record<string, string | number | boolean>>,
  themeId: string,
  colorMode: string,
): void {
  const code =
    options.configurationTarget ??
    root.querySelector<HTMLElement>("[data-theme-detail-code]");
  if (code && options.configuration)
    code.textContent = options.configuration(
      themeId,
      values[themeId] ?? {},
      colorMode,
    );
}
