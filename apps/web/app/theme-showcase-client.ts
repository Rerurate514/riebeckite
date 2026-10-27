import { reflectThemeSettings, validateThemeSettings } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { createPreview, definePluginPreview } from "@riebeckite/preview";
import {
  createPreviewSessionTransport,
  mountPreview,
} from "@riebeckite/preview/ui";
import defaultStyle from "@riebeckite/theme-default/style.css?inline";
import editorialStyle from "@riebeckite/theme-editorial/style.css?inline";
import folioStyle from "@riebeckite/theme-folio/style.css?inline";
import gardenStyle from "@riebeckite/theme-garden/style.css?inline";
import gruvboxStyle from "@riebeckite/theme-gruvbox/style.css?inline";
import minimalStyle from "@riebeckite/theme-minimal/style.css?inline";
import moduleStyle from "@riebeckite/theme-module/style.css?inline";
import rerurateStyle from "@riebeckite/theme-rerurate/style.css?inline";
import sakuraStyle from "@riebeckite/theme-sakura/style.css?inline";
import technicalStyle from "@riebeckite/theme-technical/style.css?inline";
import tokyonightStyle from "@riebeckite/theme-tokyonight/style.css?inline";
import sakuraSerifFont from "../../../packages/themes/sakura/styles/fonts/source-serif-4-latin-wght-normal.woff2?inline";
import tokyonightMonoFont from "../../../packages/themes/tokyonight/styles/fonts/jetbrains-mono-latin-wght-normal.woff2?inline";
import {
  getShowcaseFixtures,
  getShowcaseThemes,
  getThemeDocsHref,
  showcaseThemes,
} from "./lib/theme-showcase";

function inlinePreviewFont(
  style: string,
  fileName: string,
  dataUrl: string,
): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return style.replace(
    new RegExp(`url\\([^)]*${stem}[^)]*\\)`),
    () => `url("${dataUrl}")`,
  );
}

const themeStyles = {
  riebeckite: defaultStyle,
  editorial: editorialStyle,
  folio: folioStyle,
  garden: gardenStyle,
  gruvbox: gruvboxStyle,
  minimal: minimalStyle,
  module: moduleStyle,
  rerurate: rerurateStyle,
  sakura: inlinePreviewFont(
    sakuraStyle,
    "source-serif-4-latin-wght-normal.woff2",
    sakuraSerifFont,
  ),
  technical: technicalStyle,
  tokyonight: inlinePreviewFont(
    tokyonightStyle,
    "jetbrains-mono-latin-wght-normal.woff2",
    tokyonightMonoFont,
  ),
};
const themeAttributes = Object.fromEntries(
  showcaseThemes.map((theme) => [theme.name, theme.attributes]),
);

export function initThemeShowcase(): void {
  const root = document.querySelector<globalThis.HTMLElement>(
    "[data-theme-showcase]",
  );
  const previewRoot = root?.querySelector<globalThis.HTMLElement>(
    "[data-plugin-preview]",
  );
  if (!root || !previewRoot || previewRoot.dataset.previewMounted === "true")
    return;
  const locale = root.dataset.themeShowcaseLocale === "ja" ? "ja" : "en";
  const themes = getShowcaseThemes(locale);
  const fixtures = getShowcaseFixtures(locale);
  previewRoot.dataset.previewMounted = "true";
  const session = createPreview({
    plugins: [
      definePluginPreview({
        id: "theme-showcase",
        title: "Theme showcase",
        availability: "browser",
        fixtures,
        create: () => obsidianMarkdown(),
      }),
    ],
  });
  const settingsByTheme: Record<
    string,
    Record<string, string | number | boolean>
  > = {};
  const disposePreview = mountPreview(previewRoot, {
    themeStyles,
    themeAttributes,
    themeSettings: (name) => resolveSettings(name, settingsByTheme[name] ?? {}),
    pluginStyles: [],
    transport: createPreviewSessionTransport(session),
    selectors: {
      fixture: "[data-preview-fixture]",
      page: "[data-preview-page]",
    },
  });
  const themeSelect = required<globalThis.HTMLSelectElement>(
    previewRoot,
    "[data-preview-theme]",
  );
  const detailName = required<globalThis.HTMLElement>(
    root,
    "[data-theme-detail-name]",
  );
  const detailDescription = required<globalThis.HTMLElement>(
    root,
    "[data-theme-detail-description]",
  );
  const detailPackage = required<globalThis.HTMLElement>(
    root,
    "[data-theme-detail-package]",
  );
  const detailDocs = required<globalThis.HTMLAnchorElement>(
    root,
    "[data-theme-detail-docs]",
  );
  const detailCode = required<globalThis.HTMLElement>(
    root,
    "[data-theme-detail-code]",
  );
  const copy = required<globalThis.HTMLButtonElement>(
    root,
    "[data-theme-copy]",
  );
  const lifetime = new AbortController();
  const selectTheme = (name: string) => {
    const theme = themes.find((candidate) => candidate.name === name);
    if (!theme) return;
    if (themeSelect.value !== theme.name) {
      themeSelect.value = theme.name;
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    detailName.textContent = theme.label;
    detailDescription.textContent = theme.description;
    detailPackage.textContent = theme.packageName;
    detailDocs.href = getThemeDocsHref(theme.name, locale);
    detailCode.textContent = configuration(
      theme,
      settingsByTheme[theme.name],
      required<globalThis.HTMLSelectElement>(previewRoot, "[data-preview-mode]")
        .value,
    );
    renderThemeSettings(previewRoot, theme, settingsByTheme, () => {
      detailCode.textContent = configuration(
        theme,
        settingsByTheme[theme.name],
        required<globalThis.HTMLSelectElement>(
          previewRoot,
          "[data-preview-mode]",
        ).value,
      );
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    root
      .querySelectorAll<globalThis.HTMLElement>("[data-theme-card]")
      .forEach((card) => {
        card.dataset.selected = String(card.dataset.themeCard === theme.name);
      });
  };
  root
    .querySelectorAll<globalThis.HTMLButtonElement>("[data-theme-select]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => selectTheme(button.dataset.themeSelect ?? ""),
        { signal: lifetime.signal },
      );
    });
  themeSelect.addEventListener("change", () => selectTheme(themeSelect.value), {
    signal: lifetime.signal,
  });
  required<globalThis.HTMLSelectElement>(
    previewRoot,
    "[data-preview-mode]",
  ).addEventListener("change", () => selectTheme(themeSelect.value), {
    signal: lifetime.signal,
  });
  root
    .querySelectorAll<globalThis.HTMLButtonElement>("[data-preview-device]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const device = button.dataset.previewDevice;
          if (!device) return;
          required<globalThis.HTMLElement>(
            previewRoot,
            "[data-preview-viewport]",
          ).dataset.previewViewport = device;
          root
            .querySelectorAll<globalThis.HTMLButtonElement>(
              "[data-preview-device]",
            )
            .forEach((candidate) => {
              candidate.setAttribute(
                "aria-pressed",
                String(candidate === button),
              );
            });
        },
        { signal: lifetime.signal },
      );
    });
  required<globalThis.HTMLButtonElement>(
    root,
    "[data-preview-reset]",
  ).addEventListener(
    "click",
    () => {
      themeSelect.value = themes[0].name;
      for (const key of Object.keys(settingsByTheme))
        delete settingsByTheme[key];
      required<globalThis.HTMLSelectElement>(
        previewRoot,
        "[data-preview-mode]",
      ).value = "system";
      required<globalThis.HTMLSelectElement>(
        previewRoot,
        "[data-preview-fixture]",
      ).value = fixtures[0].id;
      required<globalThis.HTMLElement>(
        previewRoot,
        "[data-preview-viewport]",
      ).dataset.previewViewport = "desktop";
      root
        .querySelectorAll<globalThis.HTMLButtonElement>("[data-preview-device]")
        .forEach((button, index) => {
          button.setAttribute("aria-pressed", String(index === 0));
        });
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      required<globalThis.HTMLSelectElement>(
        previewRoot,
        "[data-preview-fixture]",
      ).dispatchEvent(new Event("change", { bubbles: true }));
    },
    { signal: lifetime.signal },
  );
  copy.addEventListener(
    "click",
    async () => {
      if (!navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(detailCode.textContent ?? "");
        copy.textContent = locale === "ja" ? "コピーしました" : "Copied";
      } catch {
        copy.textContent =
          locale === "ja" ? "コピーできませんでした" : "Copy failed";
      }
    },
    { signal: lifetime.signal },
  );
  selectTheme(themeSelect.value);
  const observer = new MutationObserver(() => {
    if (root.isConnected) return;
    observer.disconnect();
    lifetime.abort();
    disposePreview();
    void session.dispose();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function configuration(
  theme: (typeof showcaseThemes)[number],
  settings: Record<string, string | number | boolean> | undefined,
  colorMode: string,
): string {
  const options: Record<string, unknown> = {};
  if (colorMode !== "system") options.colorMode = colorMode;
  if (settings && Object.keys(settings).length > 0) options.settings = settings;
  const call =
    Object.keys(options).length > 0 ? `(${JSON.stringify(options)})` : "()";
  return `import { defineConfig } from "@riebeckite/core";\nimport { ${theme.factory} } from "${theme.packageName}";\n\nexport default defineConfig({\n  theme: ${theme.factory}${call},\n});`;
}

function resolveSettings(
  name: string,
  configured: Record<string, string | number | boolean>,
): { attributes: Readonly<Record<string, string>>; style: string } | undefined {
  const theme = showcaseThemes.find((candidate) => candidate.name === name);
  if (!theme) return undefined;
  const values = validateThemeSettings(theme.settings, configured);
  return reflectThemeSettings(
    theme.settings,
    values,
    new Set(Object.keys(configured)),
  );
}

function renderThemeSettings(
  root: HTMLElement,
  theme: (typeof showcaseThemes)[number],
  settingsByTheme: Record<string, Record<string, string | number | boolean>>,
  onChange: () => void,
): void {
  const container = required<HTMLElement>(
    root,
    "[data-preview-theme-settings]",
  );
  const settings = settingsByTheme[theme.name] ?? {};
  const fragment = document.createDocumentFragment();
  if (Object.keys(theme.presets).length > 0) {
    const field = document.createElement("label");
    field.className = "theme-showcase__setting";
    field.dataset.settingType = "preset";
    const select = document.createElement("select");
    select.className = "theme-showcase__setting-control";
    select.add(new Option("Default", ""));
    for (const [key, preset] of Object.entries(theme.presets)) {
      select.add(new Option(preset.label, key));
    }
    select.addEventListener("change", () => {
      const preset = theme.presets[select.value];
      settingsByTheme[theme.name] = preset
        ? (Object.fromEntries(
            Object.entries(preset.settings).filter(
              ([, value]) => value !== undefined,
            ),
          ) as unknown as Record<string, string | number | boolean>)
        : {};
      renderThemeSettings(root, theme, settingsByTheme, onChange);
      onChange();
    });
    field.appendChild(createSettingHead("Preset"));
    field.appendChild(select);
    fragment.appendChild(field);
  }
  for (const [key, setting] of Object.entries(theme.settings)) {
    const field = document.createElement("label");
    field.className = "theme-showcase__setting";
    field.dataset.settingType = setting.type;
    const head = createSettingHead(setting.label);
    const value = settings[key] ?? setting.default;
    let input: HTMLInputElement | HTMLSelectElement;
    if (setting.type === "select") {
      input = document.createElement("select");
      for (const option of setting.options)
        input.add(new Option(option.label, option.value));
      input.value = String(value);
    } else {
      input = document.createElement("input");
      if (setting.type === "boolean") {
        input.type = "checkbox";
        input.checked = value === true;
        head.insertBefore(input, head.firstChild);
      } else {
        input.type =
          setting.type === "color"
            ? "color"
            : setting.type === "text"
              ? "text"
              : setting.type === "slider"
                ? "range"
                : "number";
        input.value = String(value);
        if (setting.type === "number" || setting.type === "slider") {
          if (setting.min !== undefined) input.min = String(setting.min);
          if (setting.max !== undefined) input.max = String(setting.max);
          if (setting.step !== undefined) input.step = String(setting.step);
        }
      }
    }
    input.className = "theme-showcase__setting-control";
    if (setting.type !== "boolean") {
      if (
        setting.type === "color" ||
        setting.type === "number" ||
        setting.type === "slider"
      ) {
        const output = document.createElement("output");
        output.className = "theme-showcase__setting-value";
        output.textContent = input.value;
        head.appendChild(output);
        input.addEventListener("input", () => {
          output.textContent = input.value;
        });
      }
      field.appendChild(head);
      field.appendChild(input);
    } else {
      field.appendChild(head);
    }
    if (setting.description) {
      const description = document.createElement("span");
      description.className = "theme-showcase__setting-description";
      description.textContent = setting.description;
      field.appendChild(description);
    }
    input.addEventListener("change", () => {
      settingsByTheme[theme.name] = {
        ...settingsByTheme[theme.name],
        [key]:
          input instanceof HTMLInputElement && input.type === "checkbox"
            ? input.checked
            : input instanceof HTMLInputElement &&
                (input.type === "number" || input.type === "range")
              ? Number(input.value)
              : input.value,
      };
      onChange();
    });
    fragment.appendChild(field);
  }
  container.replaceChildren(fragment);
}

function createSettingHead(label: string): HTMLSpanElement {
  const head = document.createElement("span");
  head.className = "theme-showcase__setting-head";
  const name = document.createElement("span");
  name.className = "theme-showcase__setting-name";
  name.textContent = label;
  head.appendChild(name);
  return head;
}

function required<Element>(
  root: {
    querySelector(selector: string): unknown;
  },
  selector: string,
): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing theme showcase element: ${selector}`);
  return element as Element;
}
