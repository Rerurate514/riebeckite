import type { ThemeSettingsSchema } from "@riebeckite/core";
import type { ThemePreviewTheme } from "./theme-preview_part1.js";

export function renderThemeSettings(
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
        ? Object.fromEntries(
            Object.entries(preset.settings).filter(
              (entry): entry is [string, string | number | boolean] =>
                entry[1] !== undefined,
            ),
          )
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

export function fieldElement(label: string, type: string): HTMLLabelElement {
  const field = document.createElement("label");
  field.className = "theme-showcase__setting";
  field.dataset.settingType = type;
  const name = document.createElement("span");
  name.className = "theme-showcase__setting-name";
  name.textContent = label;
  field.appendChild(name);
  return field;
}

export function createInput(
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

export function required<Element extends HTMLElement>(
  root: HTMLElement,
  selector: string,
): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing theme preview element: ${selector}`);
  return element as Element;
}
