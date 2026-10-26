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
import rerurateStyle from "@riebeckite/theme-rerurate/style.css?inline";
import sakuraStyle from "@riebeckite/theme-sakura/style.css?inline";
import technicalStyle from "@riebeckite/theme-technical/style.css?inline";
import tokyonightStyle from "@riebeckite/theme-tokyonight/style.css?inline";
import sakuraSerifFont from "../../../packages/themes/sakura/styles/fonts/source-serif-4-latin-wght-normal.woff2?inline";
import tokyonightMonoFont from "../../../packages/themes/tokyonight/styles/fonts/jetbrains-mono-latin-wght-normal.woff2?inline";
import { showcaseFixtures, showcaseThemes } from "./lib/theme-showcase";

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
  previewRoot.dataset.previewMounted = "true";
  const session = createPreview({
    plugins: [
      definePluginPreview({
        id: "theme-showcase",
        title: "Theme showcase",
        availability: "browser",
        fixtures: showcaseFixtures,
        create: () => obsidianMarkdown(),
      }),
    ],
  });
  const disposePreview = mountPreview(previewRoot, {
    themeStyles,
    themeAttributes,
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
    const theme = showcaseThemes.find((candidate) => candidate.name === name);
    if (!theme) return;
    if (themeSelect.value !== theme.name) {
      themeSelect.value = theme.name;
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    detailName.textContent = theme.label;
    detailDescription.textContent = theme.description;
    detailPackage.textContent = theme.packageName;
    detailDocs.href = `/themes/${theme.name === "riebeckite" ? "default" : theme.name}`;
    detailCode.textContent = configuration(theme);
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
      themeSelect.value = showcaseThemes[0].name;
      required<globalThis.HTMLSelectElement>(
        previewRoot,
        "[data-preview-mode]",
      ).value = "system";
      required<globalThis.HTMLSelectElement>(
        previewRoot,
        "[data-preview-fixture]",
      ).value = showcaseFixtures[0].id;
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
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Copy failed";
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

function configuration(theme: (typeof showcaseThemes)[number]): string {
  return `import { defineConfig } from "@riebeckite/core";\nimport { ${theme.factory} } from "${theme.packageName}";\n\nexport default defineConfig({\n  theme: ${theme.factory}(),\n});`;
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
