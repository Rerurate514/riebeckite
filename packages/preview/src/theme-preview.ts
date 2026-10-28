import {
  reflectThemeSettings,
  type ThemePreset,
  type ThemeSettingsSchema,
  validateThemeSettings,
} from "@riebeckite/core";
import { mountPreview, type PreviewUiOptions } from "../ui.js";

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
        },
        { signal: lifetime.signal },
      );
    });
  root
    .querySelector<HTMLButtonElement>("[data-preview-reset]")
    ?.addEventListener(
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
      },
      { signal: lifetime.signal },
    );
  selectTheme();
  return () => {
    lifetime.abort();
    disposePreview();
  };
}

function updateConfiguration(
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

function renderThemeSettings(
  container: HTMLElement,
  themes: readonly ThemePreviewTheme[],
  themeId: string,
  values: Record<string, Record<string, string | number | boolean>>,
  onChange: (themeId: string) => unknown,
): void {
  const theme = themes.find((item) => item.id === themeId);
  if (!theme) return;
  const configured = values[themeId] ?? {};
  const fragment = document.createDocumentFragment();
  if (Object.keys(theme.presets).length > 0) {
    const field = fieldElement("Preset", "preset");
    const input = document.createElement("select");
    input.className = "theme-showcase__setting-control";
    input.add(new Option("Default", ""));
    for (const [key, preset] of Object.entries(theme.presets))
      input.add(new Option(preset.label, key));
    input.addEventListener("change", () => {
      const preset = theme.presets[input.value];
      values[themeId] = preset
        ? (Object.fromEntries(
            Object.entries(preset.settings).filter(
              ([, value]) => value !== undefined,
            ),
          ) as unknown as Record<string, string | number | boolean>)
        : {};
      renderThemeSettings(container, themes, themeId, values, onChange);
      onChange(themeId);
    });
    field.appendChild(input);
    fragment.appendChild(field);
  }
  for (const [key, setting] of Object.entries(theme.settings)) {
    const field = fieldElement(setting.label, setting.type);
    const value = configured[key] ?? setting.default;
    const input = createInput(setting, value);
    input.addEventListener(
      setting.type === "select" ? "change" : "input",
      () => {
        values[themeId] = {
          ...values[themeId],
          [key]:
            input instanceof HTMLInputElement && input.type === "checkbox"
              ? input.checked
              : input instanceof HTMLInputElement &&
                  (input.type === "number" || input.type === "range")
                ? Number(input.value)
                : input.value,
        };
        onChange(themeId);
      },
    );
    field.appendChild(input);
    if (setting.description) {
      const description = document.createElement("span");
      description.className = "theme-showcase__setting-description";
      description.textContent = setting.description;
      field.appendChild(description);
    }
    fragment.appendChild(field);
  }
  container.replaceChildren(fragment);
}

function fieldElement(label: string, type: string): HTMLLabelElement {
  const field = document.createElement("label");
  field.className = "theme-showcase__setting";
  field.dataset.settingType = type;
  const name = document.createElement("span");
  name.className = "theme-showcase__setting-name";
  name.textContent = label;
  field.appendChild(name);
  return field;
}

function createInput(
  setting: ThemeSettingsSchema[string],
  value: string | number | boolean,
): HTMLInputElement | HTMLSelectElement {
  if (setting.type === "select") {
    const input = document.createElement("select");
    for (const option of setting.options)
      input.add(new Option(option.label, option.value));
    input.value = String(value);
    input.className = "theme-showcase__setting-control";
    return input;
  }
  const input = document.createElement("input");
  input.type =
    setting.type === "boolean"
      ? "checkbox"
      : setting.type === "color"
        ? "color"
        : setting.type === "text"
          ? "text"
          : setting.type === "slider"
            ? "range"
            : "number";
  if (input.type === "checkbox") input.checked = value === true;
  else input.value = String(value);
  if (setting.type === "number" || setting.type === "slider") {
    if (setting.min !== undefined) input.min = String(setting.min);
    if (setting.max !== undefined) input.max = String(setting.max);
    if (setting.step !== undefined) input.step = String(setting.step);
  }
  input.className = "theme-showcase__setting-control";
  return input;
}

function required<Element extends HTMLElement>(
  root: HTMLElement,
  selector: string,
): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing theme preview element: ${selector}`);
  return element as Element;
}
